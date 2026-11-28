const { Op } = require('sequelize');

const {
  Notification,
  User,
  PushSubscription,
  Lesson,
  Group,
  Child,
  LessonResponse,
  Message,
} = require('../models');

const notificationService = require('../services/notificationService');
const ChatService = require('../services/chatService');
const { requireTenant } = require('../utils/helpers');
const { getTenantTimezone, getZonedNow } = require('../utils/timezone');

const LESSON_NOTIFY_COOLDOWN_MS = 60 * 1000;

const lessonNotifyCooldown = new Map(); // `${tenantId}:${lessonId}` -> timestamp
const lessonPersonNotifyCooldown = new Map(); // `${tenantId}:${lessonId}:${target}` -> timestamp

function formatDate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).slice(0, 10);
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}.${m}.${y}` : s;
}

function formatTime(t) {
  return t ? String(t).slice(0, 5) : '';
}

async function processLessonRemindersForLessons(lessons, adminId, io, tenantId, target = {}) {
  const remindersByParent = new Map();
  const teacherItems = [];
  let sentPushCount = 0;
  let totalCount = 0;
  let teacherPushCount = 0;

  const onlyChildId = target.childId ? String(target.childId) : null;
  const onlyTeacherId = target.teacherId ? String(target.teacherId) : null;

  for (const lesson of lessons) {
    if (!lesson.group) continue;

    const groupName = lesson.group.name || '';
    const timeRange = `${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}`;

    const teacher = lesson.substituteTeacher || lesson.group.teacher;
    const notifyTeacher =
      teacher &&
      String(teacher.id) !== String(adminId) &&
      !onlyChildId &&
      (!onlyTeacherId || String(teacher.id) === onlyTeacherId);

    if (notifyTeacher) {
      const teacherSubs = await PushSubscription.findAll({
        where: { user_id: teacher.id, tenant_id: tenantId },
      });

      if (teacherSubs.length > 0) {
        const teacherPayload = {
          title: 'Напоминание о занятии',
          body:
            `${formatDate(lesson.date)}, ${timeRange}` +
            (groupName ? ` · ${groupName}` : ''),
          icon: '/icons/turtle-192.png',
          tag: `lesson-teacher-${lesson.id}`,
          requireInteraction: false,
          data: {
            type: 'lesson_reminder_teacher',
            lessonId: lesson.id,
            url: 'app/schedule',
          },
        };
        const teacherResults = await notificationService.sendPushNotifications(
          teacherSubs,
          teacherPayload
        );
        if (teacherResults.some((r) => r.success)) teacherPushCount += 1;
      }

      teacherItems.push({ teacher, lesson, groupName, timeRange });
    }

    if (!lesson.group.children) continue;

    for (const child of lesson.group.children) {
      if (onlyTeacherId) continue;
      if (onlyChildId && String(child.id) !== onlyChildId) continue;

      const parent = child.parent;
      if (!parent) continue;

      totalCount += 1;

      const [response, created] = await LessonResponse.findOrCreate({
        where: { lesson_id: lesson.id, child_id: child.id },
        defaults: {
          tenant_id: tenantId,
          parent_id: parent.id,
          admin_id: adminId,
          status: 'pending',
          notified_at: new Date(),
        },
      });

      if (response.status !== 'pending') continue;

      if (!response.admin_id) {
        await response.update({ admin_id: adminId });
      }

      if (!created) {
        await response.update({ notified_at: new Date(), timeout_notified: false });
      }

      if (!remindersByParent.has(parent.id)) {
        remindersByParent.set(parent.id, { parent, items: [] });
      }
      remindersByParent.get(parent.id).items.push({ lesson, child });
    }
  }

  let chatCreated = 0;
  for (const [parentId, { items }] of remindersByParent) {
    const sorted = items
      .slice()
      .sort((a, b) =>
        `${a.lesson.date} ${a.lesson.startTime}`.localeCompare(
          `${b.lesson.date} ${b.lesson.startTime}`
        )
      );

    const lines = sorted.map(({ lesson, child }) => {
      const time = `${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}`;
      const groupName = lesson.group?.name ? ` · ${lesson.group.name}` : '';
      const childName =
        [child.surname, child.name].filter(Boolean).join(' ') || child.name;
      return `• ${childName} — ${formatDate(lesson.date)}, ${time}${groupName}`;
    });

    const chatId = ChatService.getChatId(adminId, parentId);

    const pushPayload = {
      title: 'У вашего ребёнка занятия',
      body:
        `${lines.join('\n')}\n\n` +
        'Если вы ПРИДЁТЕ или НЕ ПРИДЁТЕ, отметьте это на странице «Расписание» ' +
        'в личном кабинете или кнопкой в чате. Спасибо.',
      tag: `lesson-reminder-${parentId}`,
      requireInteraction: true,
      data: {
        type: 'lesson_reminder',
        lessonIds: sorted.map(({ lesson }) => lesson.id),
        childIds: sorted.map(({ child }) => child.id),
        chatId,
        url: `app/chats/${chatId}`,
      },
    };

    try {
      const subscriptions = await PushSubscription.findAll({
        where: { user_id: parentId, tenant_id: tenantId },
      });
      if (subscriptions.length > 0) {
        const results = await notificationService.sendPushNotifications(
          subscriptions,
          pushPayload
        );
        if (results.some((r) => r.success)) sentPushCount += 1;
      }
    } catch (e) {
      console.error(`[lesson-reminders] parent push error for ${parentId}:`, e.message);
    }

    try {
      const content =
        `🔔 У вашего ребёнка занятия\n` +
        lines.join('\n') +
        `\n\nОтметьте, пожалуйста, придёте вы или нет.`;

      const metadata = {
        type: 'lesson_intent',
        items: sorted.map(({ lesson, child }) => ({
          lessonId: lesson.id,
          childId: child.id,
          childName:
            [child.surname, child.name].filter(Boolean).join(' ') || child.name,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          groupName: lesson.group?.name || null,
        })),
      };

      const message = await Message.create({
        tenant_id: tenantId,
        chat_id: chatId,
        sender_id: adminId,
        content,
        is_system: false,
        metadata,
      });

      const messageWithSender = await Message.findOne({
        where: { id: message.id, tenant_id: tenantId },
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
      });

      if (io) {
        io.to(`user:${parentId}`).emit('new_message', messageWithSender);
        io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
      }

      chatCreated += 1;
    } catch (e) {
      console.error(`[lesson-reminders] chat message error for parent ${parentId}:`, e.message);
    }
  }

  let chatCreatedTeachers = 0;
  for (const item of teacherItems) {
    try {
      const chatId = ChatService.getChatId(adminId, item.teacher.id);

      const content =
        `🔔 Напоминание о занятии\n` +
        (item.groupName ? `${item.groupName} — ` : '') +
        `${formatDate(item.lesson.date)}, ${item.timeRange}`;

      const message = await Message.create({
        tenant_id: tenantId,
        chat_id: chatId,
        sender_id: adminId,
        content,
        is_system: false,
      });

      const messageWithSender = await Message.findOne({
        where: { id: message.id, tenant_id: tenantId },
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
      });

      if (io) {
        io.to(`user:${item.teacher.id}`).emit('new_message', messageWithSender);
        io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
      }

      chatCreatedTeachers += 1;
    } catch (e) {
      console.error(`[lesson-reminders] chat to teacher ${item.teacher.id} error:`, e.message);
    }
  }

  return { sentPushCount, teacherPushCount, totalCount, chatCreated, chatCreatedTeachers };
}

// =============== Базовые методы ===============

exports.getNotifications = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    const notifications = await Notification.findAndCountAll({
      where: { user_id: userId, tenant_id: tid },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    res.json({
      notifications: notifications.rows,
      total: notifications.count,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({
      where: { id, user_id: userId, tenant_id: tid },
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    await notification.update({ is_read: true, read_at: new Date() });
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

exports.sendPush = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { role, title, body, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const where = { tenantId: tid };
    if (role) where.role = role;
    const users = await User.findAll({ where, attributes: ['id'] });
    const userIds = users.map((u) => u.id);

    const payload = { title, body, data: data || {} };
    const results = await notificationService.sendToUsers(userIds, tid, payload);

    const notificationsToCreate = userIds.map((userId) => ({
      tenant_id: tid,
      user_id: userId,
      title,
      body,
      type: 'admin',
      is_read: false,
    }));
    await Notification.bulkCreate(notificationsToCreate);

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
};

exports.saveSubscription = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const userId = req.user.id;
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    const saved = await notificationService.saveSubscription(userId, tid, subscription);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

// Удаление подписки: используется переключателем уведомлений в личном кабинете
exports.deleteSubscription = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const userId = req.user.id;
    const endpoint = req.body ? req.body.endpoint : null;

    const where = { user_id: userId, tenant_id: tid };
    if (endpoint) where.endpoint = endpoint;

    const removed = await PushSubscription.destroy({ where });
    res.json({ success: true, removed });
  } catch (error) {
    next(error);
  }
};

// =============== Напоминания ===============

exports.sendLessonRemindersForLesson = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const adminId = req.user.id;
    const io = req.app.get('io');
    const { lessonId } = req.params;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    const cooldownKey = `${tid}:${lessonId}`;
    const now = Date.now();
    const lastAt = lessonNotifyCooldown.get(cooldownKey) || 0;
    if (lastAt && now - lastAt < LESSON_NOTIFY_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((LESSON_NOTIFY_COOLDOWN_MS - (now - lastAt)) / 1000);
      return res.status(429).json({
        error: `Повторная отправка возможна через ${retryAfterSec} сек.`,
        retryAfterSec,
      });
    }

    const lesson = await Lesson.findOne({
      where: { id: lessonId, tenantId: tid },
      include: [
        {
          model: Group,
          as: 'group',
          include: [
            { model: User, as: 'teacher', attributes: ['id', 'name', 'email', 'role'] },
            {
              model: Child,
              as: 'children',
              through: { attributes: [] }, // 👈 ИСПРАВЛЕНО: Добавлено для корректной загрузки детей
              include: [
                { model: User, as: 'parent', attributes: ['id', 'name', 'email', 'role'] },
              ],
            },
          ],
        },
        { model: User, as: 'substituteTeacher', attributes: ['id', 'name', 'email', 'role'] },
      ],
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const {
      sentPushCount, teacherPushCount, totalCount, chatCreated, chatCreatedTeachers,
    } = await processLessonRemindersForLessons([lesson], adminId, io, tid);

    lessonNotifyCooldown.set(cooldownKey, now);

    res.json({
      success: true,
      lessonId,
      sent: sentPushCount,
      teacherSent: teacherPushCount,
      total: totalCount,
      chatCreated,
      chatCreatedTeachers,
      message:
        `Отправлено ${sentPushCount} push родителям, ` +
        `${teacherPushCount} push учителю; ` +
        `сообщений в чат: родителям — ${chatCreated}, учителю — ${chatCreatedTeachers}`,
    });
  } catch (error) {
    next(error);
  }
};

// Уведомить одного участника занятия: ребёнка (его родителя) или преподавателя
exports.sendLessonReminderForPerson = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const adminId = req.user.id;
    const io = req.app.get('io');
    const { lessonId } = req.params;
    const { childId, teacherId } = req.body || {};

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }
    if (!childId && !teacherId) {
      return res.status(400).json({ error: 'childId or teacherId is required' });
    }
    if (childId && teacherId) {
      return res.status(400).json({ error: 'Pass only one of childId or teacherId' });
    }

    const cooldownKey = `${tid}:${lessonId}:${childId ? `child:${childId}` : `teacher:${teacherId}`}`;
    const now = Date.now();
    const lastAt = lessonPersonNotifyCooldown.get(cooldownKey) || 0;
    if (lastAt && now - lastAt < LESSON_NOTIFY_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil(
        (LESSON_NOTIFY_COOLDOWN_MS - (now - lastAt)) / 1000
      );
      return res.status(429).json({
        error: `Повторная отправка возможна через ${retryAfterSec} сек.`,
        retryAfterSec,
      });
    }

    const lesson = await Lesson.findOne({
      where: { id: lessonId, tenantId: tid },
      include: [
        {
          model: Group,
          as: 'group',
          include: [
            { model: User, as: 'teacher', attributes: ['id', 'name', 'email', 'role'] },
            {
              model: Child,
              as: 'children',
              through: { attributes: [] },
              include: [
                { model: User, as: 'parent', attributes: ['id', 'name', 'email', 'role'] },
              ],
            },
          ],
        },
        { model: User, as: 'substituteTeacher', attributes: ['id', 'name', 'email', 'role'] },
      ],
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const group = lesson.group;
    if (childId) {
      const inGroup = (group?.children || []).some(
        (child) => String(child.id) === String(childId)
      );
      if (!inGroup) {
        return res.status(404).json({ error: 'Child is not in this lesson group' });
      }
    }
    if (teacherId) {
      const actualTeacher = lesson.substituteTeacher || group?.teacher;
      if (!actualTeacher || String(actualTeacher.id) !== String(teacherId)) {
        return res.status(400).json({
          error: 'Teacher is not assigned to this lesson',
        });
      }
    }

    const result = await processLessonRemindersForLessons(
      [lesson],
      adminId,
      io,
      tid,
      { childId, teacherId }
    );

    lessonPersonNotifyCooldown.set(cooldownKey, now);

    let message;
    if (childId && result.totalCount === 0) {
      message = 'У ребёнка не указан родитель — отправлять некому.';
    } else if (childId) {
      message =
        `Родителю: push — ${result.sentPushCount}, ` +
        `сообщение в чат — ${result.chatCreated}.`;
    } else {
      message =
        `Преподавателю: push — ${result.teacherPushCount}, ` +
        `сообщение в чат — ${result.chatCreatedTeachers}.`;
    }

    res.json({
      success: true,
      lessonId,
      ...result,
      message,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendLessonRemindersForToday = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const adminId = req.user.id;
    const io = req.app.get('io');
    // «Сегодня» — по поясу центра, а не по часам сервера (он в UTC).
    const timezone = await getTenantTimezone(tid);
    const dateStr = req.body.date || getZonedNow(timezone).date;

    const lessons = await Lesson.findAll({
      where: { tenantId: tid, date: dateStr },
      include: [
        {
          model: Group,
          as: 'group',
          include: [
            { model: User, as: 'teacher', attributes: ['id', 'name', 'email', 'role'] },
            {
              model: Child,
              as: 'children',
              through: { attributes: [] }, // 👈 ИСПРАВЛЕНО: Добавлено для корректной загрузки детей
              include: [
                { model: User, as: 'parent', attributes: ['id', 'name', 'email', 'role'] },
              ],
            },
          ],
        },
        { model: User, as: 'substituteTeacher', attributes: ['id', 'name', 'email', 'role'] },
      ],
    });

    if (!lessons.length) {
      return res.json({
        success: true,
        date: dateStr,
        sent: 0,
        teacherSent: 0,
        total: 0,
        chatCreated: 0,
        chatCreatedTeachers: 0,
        message: 'Сегодня занятий нет',
      });
    }

    const {
      sentPushCount, teacherPushCount, totalCount, chatCreated, chatCreatedTeachers,
    } = await processLessonRemindersForLessons(lessons, adminId, io, tid);

    res.json({
      success: true,
      date: dateStr,
      sent: sentPushCount,
      teacherSent: teacherPushCount,
      total: totalCount,
      chatCreated,
      chatCreatedTeachers,
      message:
        `Отправлено ${sentPushCount} push родителям, ` +
        `${teacherPushCount} push учителям; ` +
        `сообщений в чат: родителям — ${chatCreated}, учителям — ${chatCreatedTeachers}`,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLessonResponses = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { date } = req.query;

    const include = [
      { model: Child, as: 'child', attributes: ['id', 'name'] },
      { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
      {
        model: Lesson,
        as: 'lesson',
        attributes: ['id', 'date', 'startTime', 'endTime'],
        include: [{ model: Group, as: 'group', attributes: ['id', 'name'] }],
      },
    ];

    if (date) include[2].where = { date };

    const responses = await LessonResponse.findAll({
      where: { tenant_id: tid },
      include,
      order: [
        [{ model: Lesson, as: 'lesson' }, 'date', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });

    res.json({ responses });
  } catch (error) {
    next(error);
  }
};