const cron = require('node-cron');
const { Op } = require('sequelize');
const {
  Lesson, Group, Child, User, PushSubscription, LessonResponse, Message, Tenant,
} = require('../models');
const notificationService = require('../services/notificationService');
const { withLock, acquireLock } = require('../utils/distributedLock');
const {
  normalizeTimeZone,
  getZonedWindow,
} = require('../utils/timezone');

const TIMEOUT_MINUTES = 10;
const REMINDER_MINUTES_AHEAD = 60;
// Лок живёт дольше, чем окно напоминания: одно занятие — один push преподавателю.
const TEACHER_PUSH_LOCK_TTL_SEC = 6 * 60 * 60;

function formatTime(t) {
  return t ? String(t).slice(0, 5) : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).slice(0, 10);
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}.${m}.${y}` : s;
}

function childFullName(child) {
  return [child?.surname, child?.name].filter(Boolean).join(' ') || child?.name || 'Ребёнок';
}

function lessonTimeRange(lesson) {
  return `${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}`;
}

/**
 * Автонапоминания «за час» и проверка «нет ответа».
 *
 * Время занятия в БД «настенное» (по часам центра), поэтому окно
 * считается в поясе каждого центра: у школ могут быть разные пояса.
 */
module.exports = (io) => {
  // ---------- 1. Автонапоминания за час ----------
  // Каждые 5 минут: окно [сейчас; сейчас + 60 мин] в поясе центра.
  // Повторы исключены: на каждого ребёнка создаётся одна запись ответа,
  // а push преподавателю закрывается локом в Redis.
  cron.schedule('*/5 * * * *', withLock('cron:auto-reminder', 240, async () => {
    const now = new Date();

    let tenants = [];
    try {
      tenants = await Tenant.findAll({ attributes: ['id', 'settings', 'status'] });
    } catch (error) {
      console.error('[cron] auto-reminder: tenants query failed:', error.message);
      return;
    }

    let sentLessons = 0;

    for (const tenant of tenants) {
      if (tenant.status !== 'active' && tenant.status !== 'trial') continue;

      const tz = normalizeTimeZone(tenant.settings && tenant.settings.timezone);
      const ranges = getZonedWindow(tz, REMINDER_MINUTES_AHEAD, now);

      let lessons = [];
      try {
        lessons = await Lesson.findAll({
          where: {
            tenantId: tenant.id,
            is_cancelled: false,
            [Op.or]: ranges.map((range) => ({
              date: range.date,
              startTime: { [Op.gte]: range.from, [Op.lte]: range.to },
            })),
          },
          include: [
            {
              model: Group,
              as: 'group',
              include: [
                { model: User, as: 'teacher' },
                {
                  model: Child,
                  as: 'children',
                  include: [{ model: User, as: 'parent' }],
                },
              ],
            },
            { model: User, as: 'substituteTeacher' },
          ],
        });
      } catch (error) {
        console.error(
          `[cron] auto-reminder: lessons query failed for tenant ${tenant.id}:`,
          error.message
        );
        continue;
      }

      if (!lessons.length) continue;

      // Отправитель сводного сообщения в «Рассылки» — администратор центра.
      let tenantAdminId = null;
      try {
        const tenantAdmin = await User.findOne({
          where: { tenantId: tenant.id, role: 'admin' },
          attributes: ['id'],
          order: [['createdAt', 'ASC']],
        });
        tenantAdminId = tenantAdmin ? tenantAdmin.id : null;
      } catch (error) {
        console.error(
          `[cron] admin lookup failed for tenant ${tenant.id}:`,
          error.message
        );
      }

      const remindersByParent = new Map();

      for (const lesson of lessons) {
        if (!lesson.group) continue;

        // Фактический преподаватель: замена на конкретное занятие важнее группы.
        const teacher = lesson.substituteTeacher || lesson.group.teacher;

        if (teacher) {
          try {
            const lockKey = `cron:teacher-reminder:${lesson.id}`;
            const lock = await acquireLock(lockKey, TEACHER_PUSH_LOCK_TTL_SEC);

            if (lock) {
              const teacherSubs = await PushSubscription.findAll({
                where: { user_id: teacher.id, tenant_id: tenant.id },
              });

              if (teacherSubs.length > 0) {
                const groupName = lesson.group.name ? ` · ${lesson.group.name}` : '';
                await notificationService.sendPushNotifications(teacherSubs, {
                  title: 'Скоро занятие',
                  body: `${formatDate(lesson.date)}, ${lessonTimeRange(lesson)}${groupName}`,
                  icon: '/icons/turtle-192.png',
                  tag: `lesson-teacher-soon-${lesson.id}`,
                  requireInteraction: false,
                  data: {
                    type: 'lesson_reminder_teacher',
                    lessonId: lesson.id,
                    url: 'app/schedule',
                  },
                });
              }
            }
          } catch (error) {
            console.error(`[cron] teacher push error for lesson ${lesson.id}:`, error.message);
          }
        }

        if (!lesson.group.children) continue;

        for (const child of lesson.group.children) {
          const parent = child.parent;
          if (!parent) continue;

          try {
            const [response, created] = await LessonResponse.findOrCreate({
              where: { lesson_id: lesson.id, child_id: child.id },
              defaults: {
                tenant_id: tenant.id,
                parent_id: parent.id,
                status: 'pending',
                notified_at: new Date(),
              },
            });

            // Уже отвечали или напоминание по этому занятию уже уходило.
            if (!created || response.status !== 'pending') continue;

            if (!remindersByParent.has(parent.id)) {
              remindersByParent.set(parent.id, { parent, items: [] });
            }
            remindersByParent.get(parent.id).items.push({ lesson, child });
          } catch (error) {
            console.error(
              `[cron] lesson response error for lesson ${lesson.id}:`,
              error.message
            );
          }
        }
      }

      // Одно сводное сообщение и один push на родителя.
      for (const [parentId, { parent, items }] of remindersByParent) {
        const sorted = items
          .slice()
          .sort((a, b) =>
            `${a.lesson.date} ${a.lesson.startTime}`.localeCompare(
              `${b.lesson.date} ${b.lesson.startTime}`
            )
          );

        const lines = sorted.map(({ lesson, child }) => {
          const groupName = lesson.group?.name ? ` · ${lesson.group.name}` : '';
          return `• ${childFullName(child)} — ${formatDate(lesson.date)}, ` +
            `${lessonTimeRange(lesson)}${groupName}`;
        });

        // Дублируем в чат «Рассылки» родителя (по просьбе владельца).
        const chatId = `broadcast_${parentId}`;

        const metadata = {
          type: 'lesson_intent',
          items: sorted.map(({ lesson, child }) => ({
            lessonId: lesson.id,
            childId: child.id,
            childName: childFullName(child),
            date: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            groupName: lesson.group?.name || null,
          })),
        };

        try {
          const content =
            '🔔 У вашего ребёнка занятия\n' +
            lines.join('\n') +
            '\n\nОтметьте, пожалуйста, придёте вы или нет.';

          const message = await Message.create({
            tenant_id: tenant.id,
            chat_id: chatId,
            sender_id: tenantAdminId || parent.id,
            content,
            // Важно: is_system=false, иначе интерфейс спрячет кнопки «Приду/Не приду».
            is_system: false,
            metadata,
          });

          const messageWithSender = await Message.findOne({
            where: { id: message.id, tenant_id: tenant.id },
            include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
          });

          if (io) {
            io.to(`user:${parentId}`).emit('new_message', messageWithSender);
            io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
          }
        } catch (error) {
          console.error(
            `[cron] reminder chat message error for parent ${parentId}:`,
            error.message
          );
        }

        try {
          const subscriptions = await PushSubscription.findAll({
            where: { user_id: parentId, tenant_id: tenant.id },
          });

          if (subscriptions.length > 0) {
            await notificationService.sendPushNotifications(subscriptions, {
              title: 'У вашего ребёнка занятия',
              body:
                `${lines.join('\n')}\n\n` +
                'Если вы ПРИДЁТЕ или НЕ ПРИДЁТЕ, отметьте это на странице ' +
                '«Расписание» или кнопкой в чате.',
              tag: `lesson-reminder-${parentId}`,
              requireInteraction: true,
              data: {
                type: 'lesson_reminder',
                chatId,
                lessonIds: sorted.map(({ lesson }) => lesson.id),
                childIds: sorted.map(({ child }) => child.id),
                url: `app/chats/${chatId}`,
              },
            });
          }
        } catch (error) {
          console.error(
            `[cron] reminder push error for parent ${parentId}:`,
            error.message
          );
        }
      }

      sentLessons += lessons.length;
    }

    if (sentLessons > 0) {
      console.log(`[cron] auto-reminders processed for ${sentLessons} lesson(s).`);
    }
  }));

  // ---------- 2. Проверка «нет ответа через 10 минут» ----------
  // notified_at хранится как обычная метка времени (UTC), пояс здесь не нужен.
  cron.schedule('*/2 * * * *', withLock('cron:timeout-check', 100, async () => {
    try {
      const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

      const pending = await LessonResponse.findAll({
        where: {
          status: 'pending',
          notified_at: { [Op.lt]: cutoff },
          timeout_notified: false,
        },
        include: [
          { model: Child, as: 'child', attributes: ['id', 'name'] },
          { model: User, as: 'parent', attributes: ['id', 'name'] },
          {
            model: Lesson,
            as: 'lesson',
            attributes: ['id', 'date', 'startTime', 'endTime'],
          },
        ],
      });

      if (!pending.length) return;

      for (const r of pending) {
        await r.update({ timeout_notified: true });

        const tid = r.tenant_id;
        const adminId = r.admin_id;
        const parentId = r.parent_id;

        if (parentId) {
          try {
            const admins = await User.findAll({
              where: { role: 'admin', tenantId: tid },
              attributes: ['id', 'name'],
            });
            const senderId = adminId || admins[0]?.id;
            if (!senderId) {
              throw new Error('no admin to send auto notification');
            }

            const content =
              `🔔 Автоуведомление: родитель ${
                r.parent?.name || ''
              } не ответил на напоминание ` +
              `в течение ${TIMEOUT_MINUTES} минут.\n` +
              `${r.child?.name || 'Ребёнок'} — ${lessonTimeRange(r.lesson || {})}`;

            const autoChatId = `auto_${tid}`;
            const message = await Message.create({
              tenant_id: tid,
              chat_id: autoChatId,
              sender_id: senderId,
              content,
              is_system: true,
            });

            const messageWithSender = await Message.findOne({
              where: { id: message.id, tenant_id: tid },
              include: [
                { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
              ],
            });

            if (io) {
              io.to(`tenant:${tid}:role:admin`).emit(
                'new_message',
                messageWithSender
              );
              io.to(`chat_${autoChatId}`).emit('new_message', messageWithSender);
            }
          } catch (e) {
            console.error('[cron] timeout auto notification error:', e.message);
          }
        }

        if (io) {
          io.to(`tenant:${tid}:role:admin`).emit('lesson_response_timeout', {
            responseId: r.id,
            childId: r.child_id,
            childName: r.child?.name,
            parentId,
            parentName: r.parent?.name,
            lessonId: r.lesson_id,
            lessonDate: r.lesson?.date,
            lessonStartTime: r.lesson?.startTime,
          });
        }

        try {
          // Админы — только из тенанта этого ответа
          const admins = await User.findAll({
            where: { role: 'admin', tenantId: tid },
            attributes: ['id'],
          });
          const adminIds = admins.map((a) => a.id);

          if (adminIds.length) {
            await notificationService.sendToUsers(adminIds, tid, {
              title: 'Нет ответа от родителя',
              body: `${r.child?.name || 'Ребёнок'}: ${
                r.parent?.name || 'родитель'
              } не ответил(а) за ${TIMEOUT_MINUTES} минут`,
              tag: `lesson-timeout-${r.id}`,
              data: {
                type: 'no_response',
                responseId: r.id,
                url: `chats/auto_${tid}`,
              },
            });
          }
        } catch (e) {
          console.error('[cron] timeout push error:', e.message);
        }
      }

      console.log(`[cron] Timeout notifications sent: ${pending.length}`);
    } catch (error) {
      console.error('[cron] Timeout job failed:', error);
    }
  }));

  console.log('[cron] Reminder jobs registered (every 5 min + timeout check).');
};
