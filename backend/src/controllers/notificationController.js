const jwt = require('jsonwebtoken');
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
const { accessSecret } = require('../config/jwt');

const RESPONSE_TOKEN_TTL = '30m';
const LESSON_NOTIFY_COOLDOWN_MS = 60 * 1000; // 60 сек между отправками

// Cooldown на уровне занятия: lessonId -> timestamp
const lessonNotifyCooldown = new Map();

// =============== Утилиты ===============

function signResponseToken(responseId) {
  return jwt.sign(
    { responseId, type: 'lesson_response' },
    accessSecret,
    { expiresIn: RESPONSE_TOKEN_TTL }
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).slice(0, 10);
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}.${m}.${y}` : s;
}

function formatTime(t) {
  return t ? String(t).slice(0, 5) : '';
}

/**
 * Применяем ответ родителя.
 * При 'yes' создаём сообщение от родителя в чате с админом.
 */
async function applyLessonResponse(responseId, status, io) {
  const response = await LessonResponse.findByPk(responseId, {
    include: [
      {
        model: Lesson,
        as: 'lesson',
        include: [{ model: Group, as: 'group', attributes: ['id', 'name'] }],
      },
      { model: Child, as: 'child', attributes: ['id', 'name'] },
      { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
    ],
  });

  if (!response) {
    const err = new Error('Response not found');
    err.status = 404;
    throw err;
  }

  if (response.status !== 'pending') {
    return response;
  }

  await response.update({ status, responded_at: new Date() });

  const adminId = response.admin_id;
  const parentId = response.parent_id;

  const event = {
    responseId: response.id,
    status,
    lessonId: response.lesson_id,
    lessonDate: response.lesson?.date,
    lessonStartTime: response.lesson?.startTime,
    groupName: response.lesson?.group?.name,
    childId: response.child_id,
    childName: response.child?.name,
    parentId,
    parentName: response.parent?.name,
    respondedAt: response.responded_at,
  };

  if (io) {
    io.to('role:admin').emit('lesson_response_update', event);
  }

  if (status === 'yes' && adminId) {
    try {
      const childName = response.child?.name || 'Ребёнок';
      const dateStr = formatDate(response.lesson?.date);
      const timeRange =
        `${formatTime(response.lesson?.startTime)}–` +
        `${formatTime(response.lesson?.endTime)}`;
      const groupName = response.lesson?.group?.name
        ? ` · ${response.lesson.group.name}`
        : '';

      const content =
        `✅ Подтверждаю участие\n` +
        `${childName} — ${dateStr}, ${timeRange}${groupName}`;

      const chatId = ChatService.getChatId(parentId, adminId);

      const message = await Message.create({
        chat_id: chatId,
        sender_id: parentId,
        content,
        is_system: false,
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
      console.error('[applyLessonResponse] chat message error:', e.message);
    }
  }

  return response;
}

/**
 * Обработка списка занятий:
 *  - родителям: LessonResponse (pending) + push с кнопками + chat в admin↔parent
 *  - преподавателю: push (информационный, без кнопок) + chat в admin↔teacher
 *
 * Возвращает агрегированную статистику.
 */
async function processLessonRemindersForLessons(lessons, adminId, io) {
  const remindersByParent = new Map();
  const teacherItems = []; // [{ teacher, lesson, groupName, timeRange }]
  let sentPushCount = 0;   // успешных push родителям
  let totalCount = 0;      // всего обработано пар (ребёнок, занятие)
  let teacherPushCount = 0; // успешных push учителям

  for (const lesson of lessons) {
    if (!lesson.group) continue;

    const groupName = lesson.group.name || '';
    const timeRange =
      `${formatTime(lesson.startTime)}–${formatTime(lesson.endTime)}`;

    // ---------------- Учитель ----------------
    const teacher = lesson.group.teacher;
    if (teacher && String(teacher.id) !== String(adminId)) {
      const teacherSubs = await PushSubscription.findAll({
        where: { user_id: teacher.id },
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
          // Формат B: без actions
        };

        const teacherResults =
          await notificationService.sendPushNotifications(
            teacherSubs,
            teacherPayload
          );
        if (teacherResults.some((r) => r.success)) teacherPushCount += 1;
      }

      teacherItems.push({ teacher, lesson, groupName, timeRange });
    }

    // ---------------- Родители ----------------
    if (!lesson.group.children) continue;

    for (const child of lesson.group.children) {
      const parent = child.parent;
      if (!parent) continue;

      totalCount += 1;

      const [response, created] = await LessonResponse.findOrCreate({
        where: { lesson_id: lesson.id, child_id: child.id },
        defaults: {
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
        await response.update({
          notified_at: new Date(),
          timeout_notified: false,
        });
      }

      if (!remindersByParent.has(parent.id)) {
        remindersByParent.set(parent.id, { parent, items: [] });
      }
      remindersByParent.get(parent.id).items.push({ lesson, child });

      const subscriptions = await PushSubscription.findAll({
        where: { user_id: parent.id },
      });
      if (!subscriptions.length) continue;

      const responseToken = signResponseToken(response.id);
      const chatId = ChatService.getChatId(adminId, parent.id);

      const payload = {
        title: 'Напоминание о занятии',
        body: `${child.name}: ${formatDate(lesson.date)} в ${formatTime(
          lesson.startTime
        )}. Вы придёте?`,
        icon: '/icons/turtle-192.png',
        tag: `lesson-reminder-${response.id}`,
        requireInteraction: true,
        data: {
          type: 'lesson_reminder',
          responseId: response.id,
          responseToken,
          lessonId: lesson.id,
          childId: child.id,
          chatId,
          url: `app/chats/${chatId}?reply=1`,
        },
        actions: [
          { action: 'yes', title: '✅ Приду' },
          { action: 'reply', title: '✍️ Написать' },
        ],
      };

      const results = await notificationService.sendPushNotifications(
        subscriptions,
        payload
      );
      if (results.some((r) => r.success)) sentPushCount += 1;
    }
  }

  // ============ Chat родителям ============
  let chatCreated = 0;
  for (const [parentId, { items }] of remindersByParent) {
    try {
      const sorted = items
        .slice()
        .sort((a, b) =>
          String(a.lesson.startTime).localeCompare(
            String(b.lesson.startTime)
          )
        );

      const lines = sorted.map(({ lesson, child }) => {
        const time = `${formatTime(lesson.startTime)}–${formatTime(
          lesson.endTime
        )}`;
        const groupName = lesson.group?.name ? ` · ${lesson.group.name}` : '';
        return `• ${child.name} — ${time}${groupName}`;
      });

      const dateForHeader = sorted[0]?.lesson?.date || '';
      const content =
        `🔔 Напоминание о занятии (${formatDate(dateForHeader)})\n` +
        lines.join('\n') +
        `\n\nПодтвердите участие в push-уведомлении ` +
        `или напишите ответным сообщением.`;

      const chatId = ChatService.getChatId(adminId, parentId);

      const message = await Message.create({
        chat_id: chatId,
        sender_id: adminId,
        content,
        is_system: false,
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
        io.to(`user:${parentId}`).emit('new_message', messageWithSender);
        io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
      }

      chatCreated += 1;
    } catch (e) {
      console.error(
        `[lesson-reminders] chat message error for parent ${parentId}:`,
        e.message
      );
    }
  }

  // ============ Chat учителям ============
  let chatCreatedTeachers = 0;
  for (const item of teacherItems) {
    try {
      const chatId = ChatService.getChatId(adminId, item.teacher.id);

      const content =
        `🔔 Напоминание о занятии\n` +
        (item.groupName ? `${item.groupName} — ` : '') +
        `${formatDate(item.lesson.date)}, ${item.timeRange}`;

      const message = await Message.create({
        chat_id: chatId,
        sender_id: adminId,
        content,
        is_system: false,
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
        io.to(`user:${item.teacher.id}`).emit('new_message', messageWithSender);
        io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
      }

      chatCreatedTeachers += 1;
    } catch (e) {
      console.error(
        `[lesson-reminders] chat to teacher ${item.teacher.id} error:`,
        e.message
      );
    }
  }

  return {
    sentPushCount,
    teacherPushCount,
    totalCount,
    chatCreated,
    chatCreatedTeachers,
  };
}

// =============== Базовые методы ===============

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    const notifications = await Notification.findAndCountAll({
      where: { user_id: userId },
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
    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({
      where: { id, user_id: userId },
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { role, title, body, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const where = {};
    if (role) where.role = role;
    const users = await User.findAll({ where, attributes: ['id'] });
    const userIds = users.map((u) => u.id);

    const payload = { title, body, data: data || {} };
    const results = await notificationService.sendToUsers(userIds, payload);

    const notificationsToCreate = userIds.map((userId) => ({
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
    const userId = req.user.id;
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    const saved = await notificationService.saveSubscription(
      userId,
      subscription
    );
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};

// =============== Напоминания ===============

exports.sendLessonRemindersForLesson = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const adminId = req.user.id;
    const io = req.app.get('io');
    const { lessonId } = req.params;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    const now = Date.now();
    const lastAt = lessonNotifyCooldown.get(lessonId) || 0;
    if (lastAt && now - lastAt < LESSON_NOTIFY_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil(
        (LESSON_NOTIFY_COOLDOWN_MS - (now - lastAt)) / 1000
      );
      return res.status(429).json({
        error: `Повторная отправка возможна через ${retryAfterSec} сек.`,
        retryAfterSec,
      });
    }

    const lesson = await Lesson.findByPk(lessonId, {
      include: [
        {
          model: Group,
          as: 'group',
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'name', 'email', 'role'],
            },
            {
              model: Child,
              as: 'children',
              include: [
                {
                  model: User,
                  as: 'parent',
                  attributes: ['id', 'name', 'email', 'role'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const {
      sentPushCount,
      teacherPushCount,
      totalCount,
      chatCreated,
      chatCreatedTeachers,
    } = await processLessonRemindersForLessons([lesson], adminId, io);

    lessonNotifyCooldown.set(lessonId, now);

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

exports.sendLessonRemindersForToday = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const adminId = req.user.id;
    const io = req.app.get('io');
    const dateStr = req.body.date || new Date().toISOString().slice(0, 10);

    const lessons = await Lesson.findAll({
      where: { date: dateStr },
      include: [
        {
          model: Group,
          as: 'group',
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'name', 'email', 'role'],
            },
            {
              model: Child,
              as: 'children',
              include: [
                {
                  model: User,
                  as: 'parent',
                  attributes: ['id', 'name', 'email', 'role'],
                },
              ],
            },
          ],
        },
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
      sentPushCount,
      teacherPushCount,
      totalCount,
      chatCreated,
      chatCreatedTeachers,
    } = await processLessonRemindersForLessons(lessons, adminId, io);

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

exports.respondToLessonReminderByToken = async (req, res, next) => {
  try {
    const { token, status } = req.body || {};
    if (!token || !['yes', 'no'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'token and status (yes|no) required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, accessSecret);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (decoded.type !== 'lesson_response' || !decoded.responseId) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    await applyLessonResponse(decoded.responseId, status, req.app.get('io'));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.respondToLessonReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['yes', 'no'].includes(status)) {
      return res.status(400).json({ error: 'status must be yes or no' });
    }

    const response = await LessonResponse.findByPk(id);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    if (req.user.role === 'parent' && response.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!['parent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await applyLessonResponse(response.id, status, req.app.get('io'));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

exports.getLessonResponses = async (req, res, next) => {
  try {
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

    if (date) {
      include[2].where = { date };
    }

    const responses = await LessonResponse.findAll({
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