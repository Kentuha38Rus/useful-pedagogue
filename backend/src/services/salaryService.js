const { Op } = require('sequelize');
const { User, Group, Course, Lesson, Attendance, Child } = require('../models');

const TEACHER_SHARE = 0.4;

/**
 * Расчёт зарплаты преподавателей за период.
 * Используется и на странице «Зарплата», и при автоначислении в финансах.
 */
async function computeSalaryReport(tenantId, from, to) {
  const teachers = await User.findAll({
    where: { role: 'teacher', tenantId },
    attributes: ['id', 'name', 'email'],
  });

  const report = [];
  let totalRevenue = 0;
  let totalSalary = 0;

  for (const teacher of teachers) {
    const groups = await Group.findAll({
      where: { teacherId: teacher.id, tenantId },
      include: [{ model: Course, as: 'course' }],
    });
    const groupIds = groups.map((g) => g.id);

    const lessonWhere = { tenantId, is_cancelled: false };
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
      const presentStudents = atts
        .filter((a) => a.status === 'present')
        .map((a) => (a.child ? a.child.name : '—'));
      const lateStudents = atts
        .filter((a) => a.status === 'late')
        .map((a) => (a.child ? a.child.name : '—'));
      const absentStudents = atts
        .filter((a) => a.status === 'absent')
        .map((a) => (a.child ? a.child.name : '—'));

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

  return {
    period: { from: from || null, to: to || null },
    share: TEACHER_SHARE,
    teachers: report,
    totals: { revenue: totalRevenue, salary: totalSalary },
  };
}

module.exports = { TEACHER_SHARE, computeSalaryReport };
