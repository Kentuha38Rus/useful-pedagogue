const { Group, Course, User, Child, Lesson } = require('../models');
const { requireTenant } = require('../utils/helpers');

exports.getGroups = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const groups = await Group.findAll({
      where: { tenantId: tid },
      include: [
        { model: Course, as: 'course' },
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: Child, as: 'children', through: { attributes: [] } },
        { model: Lesson, as: 'lessons' },
      ],
    });
    res.json(groups);
  } catch (error) {
    next(error);
  }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const group = await Group.findOne({
      where: { id, tenantId: tid },
      include: [
        { model: Course, as: 'course' },
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: Child, as: 'children', through: { attributes: [] } },
        { model: Lesson, as: 'lessons' },
      ],
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) {
    next(error);
  }
};

exports.getTeacherGroups = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const groups = await Group.findAll({
      where: { teacherId: req.user.id, tenantId: tid },
      include: [
        { model: Course, as: 'course' },
        { model: Child, as: 'children', through: { attributes: [] } },
      ],
    });
    res.json(groups);
  } catch (error) {
    next(error);
  }
};

exports.getGroupChildren = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const group = await Group.findOne({
      where: { id, tenantId: tid },
      include: [{ model: Child, as: 'children', through: { attributes: [] } }],
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (req.user.role !== 'admin' && group.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(group.children);
  } catch (error) {
    next(error);
  }
};

exports.createGroup = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { name, courseId, teacherId, schedule, maxStudents } = req.body;

    const course = await Course.findOne({ where: { id: courseId, tenantId: tid } });
    if (!course) return res.status(400).json({ message: 'Course not found' });

    const teacher = await User.findOne({ where: { id: teacherId, tenantId: tid } });
    if (!teacher || teacher.role !== 'teacher')
      return res.status(400).json({ message: 'Invalid teacher' });

    const group = await Group.create({
      tenantId: tid,
      name,
      courseId,
      teacherId,
      schedule: schedule || '{}',
      maxStudents: maxStudents || 10,
    });

    const createdGroup = await Group.findOne({
      where: { id: group.id, tenantId: tid },
      include: [
        { model: Course, as: 'course' },
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: Child, as: 'children', through: { attributes: [] } },
      ],
    });
    res.status(201).json(createdGroup);
  } catch (error) {
    next(error);
  }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const group = await Group.findOne({ where: { id, tenantId: tid } });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const { name, courseId, teacherId, schedule, maxStudents } = req.body;

    if (courseId) {
      const course = await Course.findOne({ where: { id: courseId, tenantId: tid } });
      if (!course) return res.status(400).json({ message: 'Course not found' });
    }
    if (teacherId) {
      const teacher = await User.findOne({ where: { id: teacherId, tenantId: tid } });
      if (!teacher || teacher.role !== 'teacher')
        return res.status(400).json({ message: 'Invalid teacher' });
    }

    await group.update({ name, courseId, teacherId, schedule, maxStudents });

    const updated = await Group.findOne({
      where: { id, tenantId: tid },
      include: [
        { model: Course, as: 'course' },
        { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
        { model: Child, as: 'children', through: { attributes: [] } },
      ],
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteGroup = async (req, res, next) => {
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
};