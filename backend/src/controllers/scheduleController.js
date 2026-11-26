const scheduleService = require('../services/scheduleService');
const ChatService = require('../services/chatService');
const { requireTenant } = require('../utils/helpers');
const { sendChatPush } = require('../utils/chatPush');
const { Lesson, Group, Child, User, LessonResponse, Message } = require('../models');

exports.getMySchedule = async (req, res, next) => {
  try {
    // req.user уже содержит tenantId; сервис использует его
    const lessons = await scheduleService.getScheduleForUser(req.user);
    res.json(lessons);
  } catch (error) {
    next(error);
  }
};

exports.getGroupSchedule = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const lessons = await scheduleService.getScheduleForGroup(req.params.groupId, tid);
    res.json(lessons);
  } catch (error) {
    next(error);
  }
};

exports.createLesson = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const lesson = await scheduleService.createLesson(req.body, tid);
    res.status(201).json(lesson);
  } catch (error) {
    next(error);
  }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const { attendances } = req.body;
    const updated = await scheduleService.markAttendance(id, attendances, tid);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : '');

const formatDateRu = (value) => {
  const text = String(value || '').slice(0, 10);
  const [year, month, day] = text.split('-');
  return year && month && day ? `${day}.${month}.${year}` : text;
};

// Родитель сообщает администратору, придёт ребёнок на занятие или нет
exports.respondToLessonIntent = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const role = req.effectiveRole || req.user.role;

    if (role !== 'parent') {
      return res.status(403).json({ error: 'Only parent can confirm attendance' });
    }

    const { id } = req.params;
    const { childId, status } = req.body || {};

    if (!['yes', 'no'].includes(status)) {
      return res.status(400).json({ error: 'status must be yes or no' });
    }
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const lesson = await Lesson.findOne({
      where: { id, tenantId: tid },
      include: [
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name'],
          include: [
            {
              model: Child,
              as: 'children',
              through: { attributes: [] },
              attributes: ['id', 'parentId', 'name', 'surname'],
            },
          ],
        },
      ],
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const child = (lesson.group?.children || []).find(
      (item) =>
        String(item.id) === String(childId) &&
        String(item.parentId) === String(req.user.id)
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found in this lesson' });
    }

    const admins = await User.findAll({
      where: { tenantId: tid, role: 'admin' },
      attributes: ['id', 'name', 'role'],
      order: [['createdAt', 'ASC']],
    });

    if (!admins.length) {
      return res.status(400).json({ error: 'В школе не найден администратор' });
    }

    const [response] = await LessonResponse.findOrCreate({
      where: { lesson_id: id, child_id: child.id },
      defaults: {
        tenant_id: tid,
        parent_id: req.user.id,
        admin_id: admins[0].id,
        status,
        responded_at: new Date(),
        notified_at: new Date(),
      },
    });

    await response.update({
      status,
      responded_at: new Date(),
      admin_id: admins[0].id,
    });

    const childName =
      [child.surname, child.name].filter(Boolean).join(' ') || 'Ребёнок';
    const timeRange = `${formatTime(lesson.startTime)}–${formatTime(
      lesson.endTime
    )}`;
    const groupName = lesson.group?.name ? ` · ${lesson.group.name}` : '';
    const content =
      `${status === 'yes' ? '✅ Приду' : '❌ Не приду'}\n` +
      `${childName} — ${formatDateRu(lesson.date)}, ${timeRange}${groupName}`;

    const io = req.app.get('io');
    let adminsNotified = 0;

    for (const admin of admins) {
      try {
        const chatId = ChatService.getChatId(req.user.id, admin.id);

        const message = await Message.create({
          tenant_id: tid,
          chat_id: chatId,
          sender_id: req.user.id,
          content,
        });

        const messageWithSender = await Message.findOne({
          where: { id: message.id, tenant_id: tid },
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
          ],
        });

        if (io) {
          io.to(`user:${admin.id}`).emit('new_message', messageWithSender);
          io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
        }

        await sendChatPush({
          io,
          receiver: admin,
          sender: req.user,
          chatId,
          content,
          tenantId: tid,
        });

        adminsNotified += 1;
      } catch (error) {
        console.error('[lesson-intent] chat message error:', error.message);
      }
    }

    res.json({
      success: true,
      status,
      adminsNotified,
      message: 'Администратор уведомлён в чате',
    });
  } catch (error) {
    next(error);
  }
};