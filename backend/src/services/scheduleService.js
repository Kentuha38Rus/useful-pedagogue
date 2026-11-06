const { Lesson, Group, Attendance, Child, User, Course } = require('../models');
const { Op } = require('sequelize');

/**
 * Хелпер: создать Error с HTTP-статусом.
 * errorHandler уважает err.status → отдаёт корректный код вместо 500.
 */
function httpError(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

class ScheduleService {
  async checkTeacherConflict(teacherId, date, startTime, endTime, tenantId, excludeLessonId = null) {
    const where = {
      tenantId,
      date,
      [Op.or]: [
        { startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } },
      ],
    };
    if (excludeLessonId) where.id = { [Op.ne]: excludeLessonId };

    const lessons = await Lesson.findAll({
      include: [{ model: Group, as: 'group', where: { teacherId, tenantId } }],
      where,
    });
    return lessons.length > 0;
  }

  async createLesson(data, tenantId) {
    const group = await Group.findOne({
      where: { id: data.groupId, tenantId },
      include: ['teacher'],
    });
    if (!group) {
      // 404: группа либо не существует, либо в другом тенанте —
      // клиенту не сообщаем, что именно (защита от enumeration)
      throw httpError('Group not found', 404);
    }

    const teacherId = group.teacherId;
    const conflict = await this.checkTeacherConflict(
      teacherId, data.date, data.startTime, data.endTime, tenantId
    );
    if (conflict) {
      throw httpError('Teacher has a conflicting lesson at this time', 409);
    }

    return Lesson.create({ ...data, tenantId });
  }

  async getScheduleForUser(user) {
    const tenantId = user.tenantId;

    if (user.role === 'teacher') {
      const groups = await Group.findAll({
        where: { teacherId: user.id, tenantId },
        include: ['course'],
      });
      const groupIds = groups.map((g) => g.id);
      return Lesson.findAll({
        where: { tenantId, groupId: { [Op.in]: groupIds } },
        include: [
          { model: Group, as: 'group', include: ['course'] },
          { model: Attendance, as: 'attendances', include: ['child'] },
        ],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
    } else if (user.role === 'parent') {
      const children = await Child.findAll({
        where: { parentId: user.id, tenantId },
        include: [
          {
            model: Group,
            as: 'groups',
            through: { attributes: [] },
            attributes: ['id'],
          },
        ],
      });
      const groupIds = children.flatMap((c) => (c.groups || []).map((g) => g.id));
      if (groupIds.length === 0) return [];

      return Lesson.findAll({
        where: { tenantId, groupId: { [Op.in]: groupIds } },
        include: [
          { model: Group, as: 'group', include: ['course'] },
          { model: Attendance, as: 'attendances' },
        ],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
    }
    // platform_admin без имперсонации сюда попадать не должен —
    // /api/schedule/me для него бессмысленно. Если попал — 400.
    // Имперсонированный platform_admin имеет effectiveRole='admin',
    // но user.role остаётся 'platform_admin' → тоже 400. Для полного
    // покрытия имперсонации в /schedule/me контроллер должен передавать
    // user с effectiveRole вместо реальной role — задача Фазы 3+.
    throw httpError('Invalid role', 400);
  }

  async getScheduleForGroup(groupId, tenantId) {
    const group = await Group.findOne({ where: { id: groupId, tenantId } });
    if (!group) {
      throw httpError('Group not found', 404);
    }

    return Lesson.findAll({
      where: { groupId, tenantId },
      include: [
        { model: Group, as: 'group', include: ['course'] },
        { model: Attendance, as: 'attendances', include: ['child'] },
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
  }

  async markAttendance(lessonId, attendancesData, tenantId) {
    const lesson = await Lesson.findOne({ where: { id: lessonId, tenantId } });
    if (!lesson) {
      throw httpError('Lesson not found', 404);
    }

    const group = await Group.findOne({
      where: { id: lesson.groupId, tenantId },
      include: [{ model: Child, as: 'children', through: { attributes: [] } }],
    });
    if (!group) {
      throw httpError('Group not found', 404);
    }

    const childIdsInGroup = (group.children || []).map((c) => c.id);

    for (const att of attendancesData) {
      if (!childIdsInGroup.includes(att.childId)) {
        throw httpError(`Child ${att.childId} is not in the group`, 400);
      }

      const existing = await Attendance.findOne({
        where: { lessonId, childId: att.childId, tenantId },
      });

      if (existing) {
        existing.status = att.status;
        await existing.save();
      } else {
        await Attendance.create({
          tenantId,
          lessonId,
          childId: att.childId,
          status: att.status,
        });
      }
    }

    return Attendance.findAll({
      where: { lessonId, tenantId },
      include: ['child'],
    });
  }
}

module.exports = new ScheduleService();