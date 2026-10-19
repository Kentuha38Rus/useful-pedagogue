const cron = require('node-cron');
const { Op } = require('sequelize');
const {
  Lesson,
  Group,
  Child,
  User,
  PushSubscription,
  LessonResponse,
  Message,
} = require('../models');
const notificationService = require('../services/notificationService');
const ChatService = require('../services/chatService');

const TIMEOUT_MINUTES = 10;

function formatTime(t) {
  return t ? String(t).slice(0, 5) : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).slice(0, 10);
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}.${m}.${y}` : s;
}

module.exports = (io) => {
  // ---------- 1. Автоматические напоминания за час до занятия ----------
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Running auto-reminder job...');
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const todayStr = now.toISOString().slice(0, 10);
      const startTimeStr = now.toTimeString().slice(0, 8);
      const endTimeStr = oneHourLater.toTimeString().slice(0, 8);

      const lessons = await Lesson.findAll({
        where: {
          date: todayStr,
          startTime: { [Op.between]: [startTimeStr, endTimeStr] },
          is_cancelled: false,
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
        ],
      });

      if (!lessons.length) return;

      for (const lesson of lessons) {
        if (!lesson.group) continue;

        const groupName = lesson.group.name || '';
        const timeRange =
          `${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}`;

        // ---------------- Push учителю (один раз на урок) ----------------
        const teacher = lesson.group.teacher;
        if (teacher) {
          try {
            const teacherSubs = await PushSubscription.findAll({
              where: { user_id: teacher.id },
            });

            if (teacherSubs.length > 0) {
              const teacherPayload = {
                title: 'Скоро занятие',
                body:
                  `${formatDate(lesson.date)}, ${timeRange}` +
                  (groupName ? ` · ${groupName}` : ''),
                icon: '/icons/turtle-192.png',
                tag: `lesson-teacher-soon-${lesson.id}`,
                requireInteraction: false,
                data: {
                  type: 'lesson_reminder_teacher',
                  lessonId: lesson.id,
                  url: 'app/schedule',
                },
              };

              await notificationService.sendPushNotifications(
                teacherSubs,
                teacherPayload
              );
            }
          } catch (e) {
            console.error(
              `[cron] teacher push error for lesson ${lesson.id}:`,
              e.message
            );
          }
        }

        // ---------------- Push родителям ----------------
        if (!lesson.group.children) continue;

        for (const child of lesson.group.children) {
          const parent = child.parent;
          if (!parent) continue;

          const [response, created] = await LessonResponse.findOrCreate({
            where: { lesson_id: lesson.id, child_id: child.id },
            defaults: {
              parent_id: parent.id,
              status: 'pending',
              notified_at: new Date(),
            },
          });

          if (response.status !== 'pending') continue;
          if (!created) continue;

          const subscriptions = await PushSubscription.findAll({
            where: { user_id: parent.id },
          });
          if (!subscriptions.length) continue;

          const jwt = require('jsonwebtoken');
          const { accessSecret } = require('../config/jwt');
          const responseToken = jwt.sign(
            { responseId: response.id, type: 'lesson_response' },
            accessSecret,
            { expiresIn: '30m' }
          );

          const payload = {
            title: 'Напоминание о занятии',
            body: `${child.name}: занятие начнётся через час. Вы придёте?`,
            icon: '/icons/turtle-192.png',
            tag: `lesson-reminder-${response.id}`,
            requireInteraction: true,
            data: {
              type: 'lesson_reminder',
              responseId: response.id,
              responseToken,
              lessonId: lesson.id,
              childId: child.id,
              url: 'app/schedule',
            },
            actions: [
              { action: 'yes', title: '✅ Приду' },
              { action: 'reply', title: '✍️ Написать' },
            ],
          };

          await notificationService.sendPushNotifications(subscriptions, payload);
        }
      }

      console.log('[cron] Auto-reminders sent.');
    } catch (error) {
      console.error('[cron] Auto-reminder job failed:', error);
    }
  });

  // ---------- 2. Проверка «нет ответа через 10 минут» ----------
  cron.schedule('*/2 * * * *', async () => {
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

        const adminId = r.admin_id;
        const parentId = r.parent_id;

        if (adminId && parentId) {
          try {
            const chatId = ChatService.getChatId(adminId, parentId);
            const childName = r.child?.name || 'Ребёнок';
            const timeRange =
              `${formatTime(r.lesson?.startTime)}–` +
              `${formatTime(r.lesson?.endTime)}`;

            const content =
              `🔔 Автоуведомление: родитель не ответил на напоминание ` +
              `в течение ${TIMEOUT_MINUTES} минут.\n` +
              `${childName} — ${timeRange}`;

            const message = await Message.create({
              chat_id: chatId,
              sender_id: adminId,
              content,
              is_system: true,
            });

            const messageWithSender = await Message.findByPk(message.id, {
              include: [
                {
                  model: User,
                  as: 'sender',
                  attributes: ['id', 'name', 'role'],
                },
              ],
            });

            if (io) {
              io.to(`user:${adminId}`).emit('new_message', messageWithSender);
              io.to(`user:${parentId}`).emit('new_message', messageWithSender);
              io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
            }
          } catch (e) {
            console.error('[cron] timeout system message error:', e.message);
          }
        }

        if (io) {
          io.to('role:admin').emit('lesson_response_timeout', {
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
          const admins = await User.findAll({
            where: { role: 'admin' },
            attributes: ['id'],
          });
          const adminIds = admins.map((a) => a.id);

          if (adminIds.length) {
            await notificationService.sendToUsers(adminIds, {
              title: 'Нет ответа от родителя',
              body: `${r.child?.name || 'Ребёнок'}: ${
                r.parent?.name || 'родитель'
              } не ответил(а) за ${TIMEOUT_MINUTES} минут`,
              icon: '/icons/turtle-192.png',
              tag: `lesson-timeout-${r.id}`,
              data: {
                type: 'no_response',
                responseId: r.id,
                url: 'app/chats',
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
  });
};