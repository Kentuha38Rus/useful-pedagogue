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
    if (excludeLessonId) {
      where.id = { [Op.ne]: excludeLessonId };
    }
    const lessons = await Lesson.findAll({
      include: [{
        model: Group,
        as: 'group',
        where: { teacherId },
      }],
      where,
    });
    return lessons.length > 0;
  }

  async createLesson(data) {
    const group = await Group.findByPk(data.groupId, { include: ['teacher'] });
    if (!group) {
      throw new Error('Group not found');
    }
    const teacherId = group.teacherId;
    const conflict = await this.checkTeacherConflict(teacherId, data.date, data.startTime, data.endTime);
    if (conflict) {
      throw new Error('Teacher has a conflicting lesson at this time');
    }
    const lesson = await Lesson.create(data);
    return lesson;
  }

  async getScheduleForUser(user) {
    if (user.role === 'teacher') {
      const groups = await Group.findAll({
        where: { teacherId: user.id },
        include: ['course'],
      });
      const groupIds = groups.map(g => g.id);
      const lessons = await Lesson.findAll({
        where: { groupId: { [Op.in]: groupIds } },
        include: [
          { model: Group, as: 'group', include: ['course'] },
          { model: Attendance, as: 'attendances', include: ['child'] },
        ],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
      return lessons;
    } else if (user.role === 'parent') {
      const children = await Child.findAll({
        where: { parentId: user.id },
        include: ['group'],
      });
      const groupIds = children.map(c => c.groupId).filter(id => id);
      if (groupIds.length === 0) return [];
      const lessons = await Lesson.findAll({
        where: { groupId: { [Op.in]: groupIds } },
        include: [
          { model: Group, as: 'group', include: ['course'] },
          { model: Attendance, as: 'attendances' },
        ],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
      return lessons;
    } else {
      throw new Error('Invalid role');
    }
  }

  async getScheduleForGroup(groupId) {
    const lessons = await Lesson.findAll({
      where: { groupId },
      include: [
        { model: Group, as: 'group', include: ['course'] },
        { model: Attendance, as: 'attendances', include: ['child'] },
      ],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
    return lessons;
  }

  async markAttendance(lessonId, attendancesData) {
    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }
    const group = await Group.findByPk(lesson.groupId, { include: ['children'] });
    if (!group) {
      throw new Error('Group not found');
    }
    const childIdsInGroup = group.children.map(c => c.id);
    for (let att of attendancesData) {
      if (!childIdsInGroup.includes(att.childId)) {
        throw new Error(`Child ${att.childId} is not in the group`);
      }
      await Attendance.upsert({
        lessonId,
        childId: att.childId,
        status: att.status,
      }, { conflictFields: ['lessonId', 'childId'] });
    }
    const updated = await Attendance.findAll({
      where: { lessonId },
      include: ['child'],
    });
    return updated;
  }
}

module.exports = new ScheduleService();