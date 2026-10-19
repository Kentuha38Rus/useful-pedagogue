const { Lesson, Group, Attendance, Child, User, Course } = require('../models');
const { Op } = require('sequelize');

class ScheduleService {
  async checkTeacherConflict(teacherId, date, startTime, endTime, excludeLessonId = null) {
    const where = {
      date,
      [Op.or]: [
        { startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } },
      ],
    };
    if (excludeLessonId) where.id = { [Op.ne]: excludeLessonId };

    const lessons = await Lesson.findAll({
      include: [{ model: Group, as: 'group', where: { teacherId } }],
      where,
    });
    return lessons.length > 0;
  }

  async createLesson(data) {
    const group = await Group.findByPk(data.groupId, { include: ['teacher'] });
    if (!group) throw new Error('Group not found');

    const teacherId = group.teacherId;
    const conflict = await this.checkTeacherConflict(
      teacherId,
      data.date,
      data.startTime,
      data.endTime
    );
    if (conflict) throw new Error('Teacher has a conflicting lesson at this time');

    return Lesson.create(data);
  }

  async getScheduleForUser(user) {
    if (user.role === 'teacher') {
      const groups = await Group.findAll({
        where: { teacherId: user.id },
        include: ['course'],
      });
      const groupIds = groups.map((g) => g.id);
      return Lesson.findAll({
        where: { groupId: { [Op.in]: groupIds } },
        include: [
          { model: Group, as: 'group', include: ['course'] },
          { model: Attendance, as: 'attendances', include: ['child'] },
        ],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
    } else if (user.role === 'parent') {
      const children = await Child.findAll({
        where: { parentId: user.id },
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
        where: { groupId: { [Op.in]: groupIds } },
        include: [
          { model: Group, as: 'group', include: ['course'] },
          { model: Attendance, as: 'attendances' },
        ],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
    }
    throw new Error('Invalid role');
  }

  async getScheduleForGroup(groupId) {
    return Lesson.findAll({
      where: { groupId },
      include: [
        { model: Group, as: 'group', include: ['course'] },
        { model: Attendance, as: 'attendances', include: ['child'] },
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
  }

  // ✅ ИСПРАВЛЕНО: без upsert (у нас нет UNIQUE на lessonId+childId)
  async markAttendance(lessonId, attendancesData) {
    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) throw new Error('Lesson not found');

    const group = await Group.findByPk(lesson.groupId, {
      include: [{ model: Child, as: 'children', through: { attributes: [] } }],
    });
    if (!group) throw new Error('Group not found');

    const childIdsInGroup = (group.children || []).map((c) => c.id);

    for (const att of attendancesData) {
      if (!childIdsInGroup.includes(att.childId)) {
        throw new Error(`Child ${att.childId} is not in the group`);
      }

      const existing = await Attendance.findOne({
        where: { lessonId, childId: att.childId },
      });

      if (existing) {
        existing.status = att.status;
        await existing.save();
      } else {
        await Attendance.create({
          lessonId,
          childId: att.childId,
          status: att.status,
        });
      }
    }

    return Attendance.findAll({
      where: { lessonId },
      include: ['child'],
    });
  }
}

module.exports = new ScheduleService();