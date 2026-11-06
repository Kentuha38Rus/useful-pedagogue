const {
  User,
  Child,
  Group,
  Course,
  Lesson,
  Attendance,
  ChildGroup,
  PushSubscription,
  Message,
  Notification,
  LessonResponse,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const notificationService = require('../services/notificationService');
const ChatService = require('../services/chatService');
const {
  generateLessonsForGroup,
  cancelMismatchedFutureLessons,
} = require('../jobs/recurringLessonsJob');
const { requireTenant } = require('../utils/helpers');

const TEACHER_SHARE = 0.4;
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000;

const notifyCooldown = new Map(); // `${tenantId}:${date}` -> timestamp

const isValidDateString = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

const getServerLocalDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const computeLessonStatus = (lesson, attendanceCount, now) => {
  if (lesson.is_cancelled) return 'cancelled';
  if (attendanceCount > 0) return 'done';
  const endAt = new Date(`${lesson.date}T${lesson.endTime}`);
  if (!Number.isNaN(endAt.getTime()) && endAt < now) return 'no_mark';
  return 'planned';
};

class AdminController {
  // ----- Статистика -----
  static async getStats(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { date } = req.query;
      const todayStr = isValidDateString(date) ? date : getServerLocalDateString();

      const [
        totalUsers,
        totalTeachers,
        totalParents,
        totalChildren,
        totalGroups,
        totalCourses,
      ] = await Promise.all([
        User.count({ where: { tenantId: tid } }),
        User.count({ where: { role: 'teacher', tenantId: tid } }),
        User.count({ where: { role: 'parent', tenantId: tid } }),
        Child.count({ where: { tenantId: tid } }),
        Group.count({ where: { tenantId: tid } }),
        Course.count({ where: { tenantId: tid } }),
      ]);

      const totalAdmins = Math.max(0, totalUsers - totalTeachers - totalParents);

      const todayLessons = await Lesson.count({
        where: { tenantId: tid, date: todayStr, is_cancelled: false },
      });

      const withGroups = await ChildGroup.findAll({
        attributes: ['childId'],
        where: { tenantId: tid },
        group: ['childId'],
        raw: true,
      });
      const childIdsWithGroups = withGroups.map((c) => c.childId);
      const unassignedWhere = { tenantId: tid };
      if (childIdsWithGroups.length > 0) {
        unassignedWhere.id = { [Op.notIn]: childIdsWithGroups };
      }

      const unassignedChildren = await Child.count({ where: unassignedWhere });

      const [
        teachersList,
        parentsList,
        childrenList,
        groupsList,
        coursesList,
        todayLessonsRaw,
        unassignedChildrenList,
      ] = await Promise.all([
        User.findAll({
          where: { role: 'teacher', tenantId: tid },
          attributes: ['id', 'name', 'username', 'email'],
          order: [['name', 'ASC']],
        }),
        User.findAll({
          where: { role: 'parent', tenantId: tid },
          attributes: ['id', 'name', 'username', 'email'],
          order: [['name', 'ASC']],
        }),
        Child.findAll({
          where: { tenantId: tid },
          attributes: ['id', 'name', 'birthDate'],
          order: [['name', 'ASC']],
        }),
        Group.findAll({
          where: { tenantId: tid },
          attributes: ['id', 'name', 'maxStudents'],
          include: [
            { model: User, as: 'teacher', attributes: ['id', 'name'] },
            { model: Course, as: 'course', attributes: ['id', 'name'] },
            {
              model: Child,
              as: 'children',
              through: { attributes: [] },
              attributes: ['id'],
            },
          ],
          order: [['name', 'ASC']],
        }),
        Course.findAll({
          where: { tenantId: tid },
          attributes: ['id', 'name', 'price'],
          order: [['name', 'ASC']],
        }),
        Lesson.findAll({
          where: { tenantId: tid, date: todayStr },
          attributes: ['id', 'date', 'startTime', 'endTime', 'topic', 'is_cancelled'],
          include: [
            {
              model: Group,
              as: 'group',
              attributes: ['id', 'name'],
              include: [
                { model: User, as: 'teacher', attributes: ['id', 'name'] },
                { model: Course, as: 'course', attributes: ['id', 'name'] },
              ],
            },
          ],
          order: [['startTime', 'ASC']],
        }),
        Child.findAll({
          where: unassignedWhere,
          attributes: ['id', 'name', 'birthDate'],
          order: [['name', 'ASC']],
        }),
      ]);

      const lessonIds = todayLessonsRaw.map((l) => l.id);
      let attMap = new Map();
      if (lessonIds.length > 0) {
        const attCounts = await Attendance.findAll({
          where: { tenantId: tid, lessonId: { [Op.in]: lessonIds } },
          attributes: [
            'lessonId',
            [sequelize.fn('COUNT', sequelize.col('id')), 'cnt'],
          ],
          group: ['lessonId'],
          raw: true,
        });
        attMap = new Map(attCounts.map((r) => [r.lessonId, Number(r.cnt)]));
      }

      const now = new Date();
      const todayLessonsMapped = todayLessonsRaw.map((l) => {
        const attCount = attMap.get(l.id) || 0;
        const status = computeLessonStatus(l, attCount, now);
        return {
          id: l.id,
          startTime: l.startTime,
          endTime: l.endTime,
          topic: l.topic,
          groupName: l.group ? l.group.name : null,
          teacherName: l.group && l.group.teacher ? l.group.teacher.name : null,
          courseName: l.group && l.group.course ? l.group.course.name : null,
          status,
        };
      });

      const cooldownKey = `${tid}:${todayStr}`;
      const lastNotifyAt = notifyCooldown.get(cooldownKey) || 0;
      const elapsed = Date.now() - lastNotifyAt;
      const notifyCooldownSec = lastNotifyAt
        ? Math.max(0, Math.ceil((NOTIFY_COOLDOWN_MS - elapsed) / 1000))
        : 0;

      res.status(200).json({
        totalUsers,
        totalAdmins,
        totalTeachers,
        totalParents,
        totalChildren,
        totalGroups,
        totalCourses,
        todayLessons,
        today: todayStr,
        unassignedChildren,
        notifyCooldownSec,
        details: {
          teachers: teachersList,
          parents: parentsList,
          children: childrenList,
          groups: groupsList.map((g) => ({
            id: g.id,
            name: g.name,
            teacherName: g.teacher ? g.teacher.name : null,
            courseName: g.course ? g.course.name : null,
            childrenCount: (g.children || []).length,
            maxStudents: g.maxStudents,
          })),
          courses: coursesList.map((c) => ({
            id: c.id,
            name: c.name,
            price: toNumberOrNull(c.price),
          })),
          todayLessons: todayLessonsMapped,
          unassignedChildren: unassignedChildrenList,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ----- Уведомление по сегодняшним занятиям -----
  static async notifyTodayLessons(req, res, next) {
    const trace = [];
    try {
      const tid = requireTenant(req);
      const { date, title, body } = req.body || {};
      const todayStr = isValidDateString(date) ? date : getServerLocalDateString();
      trace.push(`date=${todayStr}`);

      const cooldownKey = `${tid}:${todayStr}`;
      const now = Date.now();
      const lastAt = notifyCooldown.get(cooldownKey) || 0;
      if (lastAt && now - lastAt < NOTIFY_COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((NOTIFY_COOLDOWN_MS - (now - lastAt)) / 1000);
        trace.push(`cooldown active, retryAfter=${retryAfterSec}s`);
        return res.status(429).json({
          message: `Повторная отправка возможна через ${retryAfterSec} сек.`,
          retryAfterSec,
          trace,
        });
      }

      let lessons;
      try {
        lessons = await Lesson.findAll({
          where: { tenantId: tid, date: todayStr, is_cancelled: false },
          attributes: ['id'],
          include: [
            {
              model: Group,
              as: 'group',
              attributes: ['id', 'name'],
              include: [
                { model: User, as: 'teacher', attributes: ['id', 'name', 'role'] },
                {
                  model: Child,
                  as: 'children',
                  through: { attributes: [] },
                  attributes: ['id'],
                  include: [
                    { model: User, as: 'parent', attributes: ['id', 'name', 'role'] },
                  ],
                },
              ],
            },
          ],
        });
        trace.push(`lessons=${lessons.length}`);
      } catch (e) {
        trace.push(`lessons query failed: ${e.message}`);
        console.error('[notifyTodayLessons] lessons query:', e);
        return res.status(500).json({
          error: 'Не удалось загрузить занятия',
          message: e.message,
          trace,
        });
      }

      if (!lessons.length) {
        return res.status(200).json({
          success: true,
          date: todayStr,
          lessonsCount: 0,
          totalRecipients: 0,
          subscriptions: 0,
          socketEmitted: 0,
          chatCreated: 0,
          message: 'Сегодня занятий нет — уведомления не отправлены.',
          trace,
        });
      }

      const recipientMap = new Map();
      for (const lesson of lessons) {
        const group = lesson.group;
        if (!group) continue;
        if (group.teacher) {
          recipientMap.set(group.teacher.id, {
            id: group.teacher.id,
            name: group.teacher.name,
            role: 'teacher',
          });
        }
        for (const child of group.children || []) {
          if (child.parent) {
            recipientMap.set(child.parent.id, {
              id: child.parent.id,
              name: child.parent.name,
              role: 'parent',
            });
          }
        }
      }
      const recipients = Array.from(recipientMap.values());
      const userIds = recipients.map((r) => r.id);
      trace.push(`recipients=${recipients.length}`);

      if (userIds.length === 0) {
        return res.status(200).json({
          success: true,
          date: todayStr,
          lessonsCount: lessons.length,
          totalRecipients: 0,
          subscriptions: 0,
          socketEmitted: 0,
          chatCreated: 0,
          message: 'По сегодняшним занятиям нет ни родителей, ни преподавателей для уведомления.',
          trace,
        });
      }

      const finalTitle = (title && String(title).trim()) || 'Напоминание о занятии';
      const finalBody =
        (body && String(body).trim()) ||
        `Сегодня запланировано занятий: ${lessons.length}. Пожалуйста, проверьте расписание.`;

      const payload = {
        title: finalTitle,
        body: finalBody,
        data: { type: 'lesson-today', date: todayStr },
      };

      const io = req.app.get('io');

      let pushResults = [];
      let pushError = null;
      let subscriptionsCount = 0;
      try {
        const subscriptions = await PushSubscription.findAll({
          where: { tenant_id: tid, user_id: userIds },
        });
        subscriptionsCount = subscriptions.length;
        if (subscriptions.length > 0) {
          pushResults = await notificationService.sendPushNotifications(subscriptions, payload);
        }
        trace.push(`push: subs=${subscriptionsCount}`);
      } catch (e) {
        pushError = e.message;
        trace.push(`push failed: ${e.message}`);
        console.error('[notifyTodayLessons] push error:', e);
      }

      let socketEmitted = 0;
      try {
        if (io) {
          for (const uid of userIds) {
            io.to(`user:${uid}`).emit('notification', {
              ...payload,
              createdAt: new Date().toISOString(),
            });
            socketEmitted += 1;
          }
          trace.push(`socket notification: emitted to ${socketEmitted}`);
        } else {
          trace.push('socket: io not available');
        }
      } catch (e) {
        trace.push(`socket notification failed: ${e.message}`);
        console.error('[notifyTodayLessons] socket error:', e);
      }

      let chatCreated = 0;
      try {
        const adminId = req.user.id;
        const chatText = `${finalTitle}\n${finalBody}`;

        for (const recipient of recipients) {
          try {
            const chatId = ChatService.getChatId(adminId, recipient.id);

            const message = await Message.create({
              tenant_id: tid,
              chat_id: chatId,
              sender_id: adminId,
              content: chatText,
            });

            const messageWithSender = await Message.findOne({
              where: { id: message.id, tenant_id: tid },
              include: [
                { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
              ],
            });

            if (io) {
              io.to(`user:${recipient.id}`).emit('new_message', messageWithSender);
              io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
            }

            chatCreated += 1;
          } catch (e) {
            trace.push(`chat err for ${recipient.id}: ${e.message}`);
            console.error('[notifyTodayLessons] chat message error:', e);
          }
        }
        trace.push(`chat messages created: ${chatCreated}`);
      } catch (e) {
        trace.push(`chat block failed: ${e.message}`);
        console.error('[notifyTodayLessons] chat block error:', e);
      }

      notifyCooldown.set(cooldownKey, now);

      res.status(200).json({
        success: true,
        date: todayStr,
        lessonsCount: lessons.length,
        totalRecipients: recipients.length,
        subscriptions: subscriptionsCount,
        pushResults,
        pushError,
        socketEmitted,
        chatCreated,
        cooldownSec: Math.ceil(NOTIFY_COOLDOWN_MS / 1000),
        message: `Уведомление отправлено ${recipients.length} получател(ям), сообщений в чат: ${chatCreated}.`,
        trace,
      });
    } catch (error) {
      console.error('[notifyTodayLessons] unexpected:', error);
      next(error);
    }
  }

  // ----- Отчёт по зарплате -----
  static async getSalaryReport(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { from, to } = req.query;

      const teachers = await User.findAll({
        where: { role: 'teacher', tenantId: tid },
        attributes: ['id', 'name', 'email'],
      });

      const report = [];
      let totalRevenue = 0;
      let totalSalary = 0;

      for (const teacher of teachers) {
        const groups = await Group.findAll({
          where: { teacherId: teacher.id, tenantId: tid },
          include: [{ model: Course, as: 'course' }],
        });
        const groupIds = groups.map((g) => g.id);

        const lessonWhere = { tenantId: tid, is_cancelled: false };
        if (groupIds.length > 0) {
          lessonWhere.groupId = { [Op.in]: groupIds };
        } else {
          lessonWhere.groupId = null;
        }

        if (from || to) {
          lessonWhere.date = {};
          if (from) lessonWhere.date[Op.gte] = from;
          if (to) lessonWhere.date[Op.lte] = to;
        }

        const lessons = await Lesson.findAll({
          where: lessonWhere,
          include: [
            { model: Group, as: 'group', include: [{ model: Course, as: 'course' }] },
            {
              model: Attendance,
              as: 'attendances',
              required: true,
              include: [{ model: Child, as: 'child', attributes: ['id', 'name'] }],
            },
          ],
          order: [['date', 'DESC'], ['startTime', 'ASC']],
        });

        let lessonsCount = 0;
        let presentCount = 0;
        let revenue = 0;
        let salary = 0;
        const details = [];

        for (const lesson of lessons) {
          const course = lesson.group && lesson.group.course;
          const price = course ? parseFloat(course.price) : 0;

          const atts = lesson.attendances || [];
          const presentStudents = atts.filter((a) => a.status === 'present').map((a) => (a.child ? a.child.name : '—'));
          const lateStudents = atts.filter((a) => a.status === 'late').map((a) => (a.child ? a.child.name : '—'));
          const absentStudents = atts.filter((a) => a.status === 'absent').map((a) => (a.child ? a.child.name : '—'));

          const present = presentStudents.length;
          const late = lateStudents.length;
          const absent = absentStudents.length;

          if (present === 0) continue;

          const lessonRevenue = present * price;
          const lessonSalary = lessonRevenue * TEACHER_SHARE;

          lessonsCount += 1;
          presentCount += present;
          revenue += lessonRevenue;
          salary += lessonSalary;

          details.push({
            lessonId: lesson.id,
            date: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            groupName: lesson.group ? lesson.group.name : '—',
            courseName: course ? course.name : '—',
            price,
            presentCount: present,
            lateCount: late,
            absentCount: absent,
            presentStudents,
            lateStudents,
            absentStudents,
            revenue: lessonRevenue,
            salary: lessonSalary,
          });
        }

        if (lessonsCount > 0) {
          report.push({
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherEmail: teacher.email,
            lessonsCount,
            presentCount,
            revenue,
            salary,
            details,
          });
          totalRevenue += revenue;
          totalSalary += salary;
        }
      }

      res.status(200).json({
        period: { from: from || null, to: to || null },
        share: TEACHER_SHARE,
        teachers: report,
        totals: { revenue: totalRevenue, salary: totalSalary },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // ----- Пользователи -----
  static async getAllUsers(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { page = 1, limit = 20, role, search } = req.query;
      const offset = (page - 1) * limit;
      const where = { tenantId: tid };
      if (role) where.role = role;
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['passwordHash'] },
        include: [
          {
            model: Child,
            as: 'children',
            attributes: ['id', 'name', 'birthDate'],
            include: [
              {
                model: Group,
                as: 'groups',
                through: { attributes: [] },
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true,
      });

      res.status(200).json({
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        users: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserDetails(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { id } = req.params;
      const user = await User.findOne({
        where: { id, tenantId: tid },
        attributes: { exclude: ['passwordHash'] },
        include: [
          {
            model: Child,
            as: 'children',
            include: [
              {
                model: Group,
                as: 'groups',
                through: { attributes: [] },
                include: [{ model: Course, as: 'course' }],
              },
              { model: Attendance, as: 'attendances' },
            ],
          },
          {
            model: Group,
            as: 'groups',
            include: [
              { model: Course, as: 'course' },
              { model: Child, as: 'children', through: { attributes: [] } },
            ],
          },
        ],
      });
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { id } = req.params;
      const { role } = req.body;
      if (!['admin', 'teacher', 'parent'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      const user = await User.findOne({ where: { id, tenantId: tid } });
      if (!user) return res.status(404).json({ message: 'User not found' });
      user.role = role;
      await user.save();
      res.status(200).json({
        message: 'Role updated',
        user: { id: user.id, role: user.role },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { username, email, password, name, phone, role } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ message: 'Username, password and name are required' });
      }
      if (!['admin', 'teacher', 'parent'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername)
        return res.status(400).json({ message: 'Username already taken' });

      if (email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail)
          return res.status(400).json({ message: 'Email already in use' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        tenantId: tid,
        username,
        email: email || null,
        passwordHash,
        name,
        phone: phone || null,
        role,
      });
      const { passwordHash: _, ...userData } = user.toJSON();
      res.status(201).json(userData);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { id } = req.params;
      const user = await User.findOne({ where: { id, tenantId: tid } });
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      await sequelize.transaction(async (t) => {
        const opts = { transaction: t };

        await Message.destroy({ where: { tenant_id: tid, sender_id: user.id } }, opts);
        await PushSubscription.destroy({ where: { tenant_id: tid, user_id: user.id } }, opts);
        await Notification.destroy({ where: { tenant_id: tid, user_id: user.id } }, opts);
        await LessonResponse.destroy({ where: { tenant_id: tid, parent_id: user.id } }, opts);
        await LessonResponse.destroy({ where: { tenant_id: tid, admin_id: user.id } }, opts);
        await Group.destroy({ where: { tenantId: tid, teacherId: user.id } }, opts);
        await Child.destroy({ where: { tenantId: tid, parentId: user.id } }, opts);
        await user.destroy(opts);
      });

      res.status(204).send();
    } catch (error) {
      if (error?.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
          message: 'Не удалось удалить: остались связанные записи. Обновите страницу и попробуйте снова.',
          detail: error.parent?.detail || error.message,
        });
      }
      next(error);
    }
  }

  // ----- Группы -----
  static async getAllGroups(req, res, next) {
    try {
      const tid = requireTenant(req);
      const groups = await Group.findAll({
        where: { tenantId: tid },
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
          {
            model: Child,
            as: 'children',
            through: { attributes: [] },
            attributes: ['id', 'name'],
          },
          {
            model: Lesson,
            as: 'lessons',
            where: { is_cancelled: false },
            required: false,
          },
        ],
        order: [['createdAt', 'DESC']],
      });
      res.status(200).json(groups);
    } catch (error) {
      next(error);
    }
  }

  static async createGroup(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { courseId, teacherId, name, schedule, maxStudents, lessons } = req.body;

      const course = await Course.findOne({ where: { id: courseId, tenantId: tid } });
      if (!course) return res.status(400).json({ message: 'Course not found' });
      const teacher = await User.findOne({ where: { id: teacherId, tenantId: tid } });
      if (!teacher || teacher.role !== 'teacher')
        return res.status(400).json({ message: 'Invalid teacher' });

      const group = await Group.create({
        tenantId: tid,
        courseId,
        teacherId,
        name,
        schedule: schedule || null,
        maxStudents: maxStudents || 10,
      });

      if (Array.isArray(lessons) && lessons.length > 0) {
        const lessonData = lessons.map((l) => ({
          tenantId: tid,
          groupId: group.id,
          date: l.date,
          startTime: l.startTime,
          endTime: l.endTime,
          topic: l.topic || null,
        }));
        try {
          await Lesson.bulkCreate(lessonData, { ignoreDuplicates: true });
        } catch (e) {
          console.error('[createGroup] bulkCreate lessons:', e.message);
        }
      }

      const gen = await generateLessonsForGroup(group);
      console.log(
        `[createGroup] group=${group.id} generated: created=${gen.created}, skipped=${gen.skipped}`
      );

      const createdGroup = await Group.findOne({
        where: { id: group.id, tenantId: tid },
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
          { model: Child, as: 'children', through: { attributes: [] } },
          {
            model: Lesson,
            as: 'lessons',
            where: { is_cancelled: false },
            required: false,
          },
        ],
      });
      res.status(201).json(createdGroup);
    } catch (error) {
      next(error);
    }
  }

  static async updateGroup(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { id } = req.params;
      const group = await Group.findOne({ where: { id, tenantId: tid } });
      if (!group) return res.status(404).json({ message: 'Group not found' });

      const { courseId, teacherId, name, schedule, maxStudents, lessons } = req.body;

      if (courseId) {
        const course = await Course.findOne({ where: { id: courseId, tenantId: tid } });
        if (!course) return res.status(400).json({ message: 'Course not found' });
      }
      if (teacherId) {
        const teacher = await User.findOne({ where: { id: teacherId, tenantId: tid } });
        if (!teacher || teacher.role !== 'teacher')
          return res.status(400).json({ message: 'Invalid teacher' });
      }

      const newSchedule = schedule !== undefined ? schedule : group.schedule;
      const tempGroup = { ...group.toJSON(), schedule: newSchedule };
      const cancelRes = await cancelMismatchedFutureLessons(tempGroup);
      if (cancelRes.cancelled) {
        console.log(
          `[updateGroup] group=${group.id} cancelled ${cancelRes.cancelled} mismatched lessons`
        );
      }

      await group.update({
        courseId: courseId || group.courseId,
        teacherId: teacherId || group.teacherId,
        name: name || group.name,
        schedule: newSchedule,
        maxStudents: maxStudents || group.maxStudents,
      });

      if (Array.isArray(lessons) && lessons.length > 0) {
        const lessonData = lessons.map((l) => ({
          tenantId: tid,
          groupId: group.id,
          date: l.date,
          startTime: l.startTime,
          endTime: l.endTime,
          topic: l.topic || null,
        }));
        try {
          await Lesson.bulkCreate(lessonData, { ignoreDuplicates: true });
        } catch (e) {
          console.error('[updateGroup] bulkCreate lessons:', e.message);
        }
      }

      const gen = await generateLessonsForGroup(group);
      console.log(
        `[updateGroup] group=${group.id} generated: created=${gen.created}, skipped=${gen.skipped}`
      );

      const updated = await Group.findOne({
        where: { id, tenantId: tid },
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
          { model: Child, as: 'children', through: { attributes: [] } },
          {
            model: Lesson,
            as: 'lessons',
            where: { is_cancelled: false },
            required: false,
          },
        ],
      });
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteGroup(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { id } = req.params;
      const group = await Group.findOne({ where: { id, tenantId: tid } });
      if (!group) return res.status(404).json({ message: 'Group not found' });
      await group.destroy();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ----- Курсы -----
  static async getAllCourses(req, res, next) {
    try {
      const tid = requireTenant(req);
      const courses = await Course.findAll({
        where: { tenantId: tid },
        include: [
          {
            model: Group,
            as: 'groups',
            include: [{ model: User, as: 'teacher' }],
          },
        ],
        order: [['createdAt', 'DESC']],
      });
      res.status(200).json(courses);
    } catch (error) {
      next(error);
    }
  }

  static async createCourse(req, res, next) {
    try {
      const tid = requireTenant(req);
      const course = await Course.create({ ...req.body, tenantId: tid });
      res.status(201).json(course);
    } catch (error) {
      next(error);
    }
  }

  static async updateCourse(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { id } = req.params;
      const course = await Course.findOne({ where: { id, tenantId: tid } });
      if (!course) return res.status(404).json({ message: 'Course not found' });
      await course.update(req.body);
      res.status(200).json(course);
    } catch (error) {
      next(error);
    }
  }

  static async deleteCourse(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { id } = req.params;
      const course = await Course.findOne({ where: { id, tenantId: tid } });
      if (!course) return res.status(404).json({ message: 'Course not found' });
      await course.destroy();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ----- Платежи (заглушка) -----
  static async getPayments(req, res, next) {
    try {
      const tid = requireTenant(req);
      const children = await Child.findAll({
        where: { tenantId: tid },
        include: [
          {
            model: Group,
            as: 'groups',
            through: { attributes: [] },
            include: [{ model: Course, as: 'course' }],
          },
          { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        ],
      });
      const payments = [];
      children.forEach((child) => {
        const parentName = child.parent ? child.parent.name : null;
        (child.groups || []).forEach((group) => {
          payments.push({
            childId: child.id,
            childName: child.name,
            parentName,
            groupName: group.name,
            courseName: group.course ? group.course.name : null,
            price: group.course ? group.course.price : 0,
            status: 'pending',
          });
        });
        if (!child.groups || child.groups.length === 0) {
          payments.push({
            childId: child.id,
            childName: child.name,
            parentName,
            groupName: null,
            courseName: null,
            price: 0,
            status: 'no_group',
          });
        }
      });
      res.status(200).json(payments);
    } catch (error) {
      next(error);
    }
  }

  // ----- Управление группами детей -----
  static async getAvailableChildren(req, res, next) {
    try {
      const tid = requireTenant(req);
      const children = await Child.findAll({
        where: { tenantId: tid },
        include: [
          { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
          {
            model: Group,
            as: 'groups',
            through: { attributes: [] },
            attributes: ['id', 'name'],
          },
        ],
        order: [['name', 'ASC']],
      });
      res.status(200).json(children);
    } catch (error) {
      next(error);
    }
  }

  static async addChildToGroup(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { childId, groupId } = req.body;
      if (!childId || !groupId)
        return res.status(400).json({ message: 'childId and groupId are required' });

      const child = await Child.findOne({ where: { id: childId, tenantId: tid } });
      if (!child) return res.status(404).json({ message: 'Child not found' });

      const group = await Group.findOne({ where: { id: groupId, tenantId: tid } });
      if (!group) return res.status(404).json({ message: 'Group not found' });

      const existing = await ChildGroup.findOne({
        where: { childId, groupId, tenantId: tid },
      });
      if (existing)
        return res.status(400).json({ message: 'Child is already in this group' });

      const currentCount = await ChildGroup.count({
        where: { groupId, tenantId: tid },
      });
      if (currentCount >= group.maxStudents)
        return res.status(400).json({ message: 'Group is full' });

      await ChildGroup.create({ tenantId: tid, childId, groupId });

      const updatedChild = await Child.findOne({
        where: { id: childId, tenantId: tid },
        include: [
          { model: Group, as: 'groups', through: { attributes: [] } },
          { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        ],
      });
      res.status(200).json(updatedChild);
    } catch (error) {
      next(error);
    }
  }

  static async removeChildFromGroup(req, res, next) {
    try {
      const tid = requireTenant(req);
      const { childId, groupId } = req.body;
      if (!childId || !groupId)
        return res.status(400).json({ message: 'childId and groupId are required' });

      const link = await ChildGroup.findOne({
        where: { childId, groupId, tenantId: tid },
      });
      if (!link) return res.status(404).json({ message: 'Link not found' });

      await link.destroy();
      res.status(200).json({ message: 'Child removed from group' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;