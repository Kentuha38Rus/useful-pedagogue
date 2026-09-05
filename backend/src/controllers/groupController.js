const { Group, Course, User } = require('../models');

exports.getGroups = async (req, res, next) => {
  try {
    const groups = await Group.findAll({
      include: ['course', 'teacher', 'children'],
    });
    res.json(groups);
  } catch (error) {
    next(error);
  }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await Group.findByPk(id, {
      include: ['course', 'teacher', 'children'],
    });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json(group);
  } catch (error) {
    next(error);
  }
};

exports.createGroup = async (req, res, next) => {
  try {
    const { name, courseId, teacherId, schedule, maxStudents } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(400).json({ message: 'Course not found' });
    }

    const teacher = await User.findByPk(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ message: 'Invalid teacher' });
    }

    const group = await Group.create({
      name,
      courseId,
      teacherId,
      schedule: schedule || '{}',
      maxStudents: maxStudents || 10,
    });

    // Возвращаем созданную группу с подгруженными связями
    const createdGroup = await Group.findByPk(group.id, {
      include: ['course', 'teacher', 'children'],
    });
    res.status(201).json(createdGroup);
  } catch (error) {
    next(error);
  }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const { name, courseId, teacherId, schedule, maxStudents } = req.body;

    if (courseId) {
      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.status(400).json({ message: 'Course not found' });
      }
    }
    if (teacherId) {
      const teacher = await User.findByPk(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ message: 'Invalid teacher' });
      }
    }

    await group.update({
      name,
      courseId,
      teacherId,
      schedule,
      maxStudents,
    });

    // Возвращаем обновлённую группу с подгруженными связями
    const updatedGroup = await Group.findByPk(id, {
      include: ['course', 'teacher', 'children'],
    });
    res.json(updatedGroup);
  } catch (error) {
    next(error);
  }
};

exports.deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    await group.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};