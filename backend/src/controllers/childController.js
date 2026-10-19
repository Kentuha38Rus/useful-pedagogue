const { Child, Group, Lesson, User } = require('../models');
const { Op } = require('sequelize');

// GET /children
// parent  → только свои дети (с группами и занятиями каждой группы)
// teacher → дети из групп, где он teacher
// admin   → все дети
exports.getChildren = async (req, res, next) => {
  try {
    const user = req.user;
    let where = {};
    let groupWhere;
    let groupRequired = false;

    if (user.role === 'parent') {
      where.parentId = user.id;
    } else if (user.role === 'teacher') {
      groupWhere = { teacherId: user.id };
      groupRequired = true;
    }

    // 1. Получаем детей с их группами (без lessons)
    const children = await Child.findAll({
      where,
      include: [
        {
          model: Group,
          as: 'groups',
          where: groupWhere,
          required: groupRequired,
          through: { attributes: [] },
          include: [
            {
              model: User,
              as: 'teacher',
              attributes: ['id', 'name', 'email'],
            },
          ],
        },
        {
          model: User,
          as: 'parent',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['name', 'ASC']],
    });

    // 2. Собираем все уникальные groupId
    const groupIds = new Set();
    children.forEach((child) => {
      (child.groups || []).forEach((g) => groupIds.add(g.id));
    });

    // 3. Отдельным запросом грузим занятия для этих групп
    let lessons = [];
    if (groupIds.size > 0) {
      lessons = await Lesson.findAll({
        where: { groupId: { [Op.in]: Array.from(groupIds) } },
        attributes: ['id', 'date', 'startTime', 'endTime', 'topic', 'groupId'],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
    }

    // 4. Раскладываем занятия по группам
    const lessonsByGroup = {};
    lessons.forEach((l) => {
      if (!lessonsByGroup[l.groupId]) lessonsByGroup[l.groupId] = [];
      lessonsByGroup[l.groupId].push({
        id: l.id,
        date: l.date,
        startTime: l.startTime,
        endTime: l.endTime,
        topic: l.topic,
      });
    });

    // 5. Приклеиваем lessons к группам в ответе
    const result = children.map((child) => {
      const plain = child.toJSON();
      plain.groups = (plain.groups || []).map((g) => ({
        ...g,
        lessons: lessonsByGroup[g.id] || [],
      }));
      return plain;
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET /children/:id
exports.getChildById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const child = await Child.findByPk(id, {
      include: [
        {
          model: Group,
          as: 'groups',
          through: { attributes: [] },
          include: [
            { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          ],
        },
        {
          model: User,
          as: 'parent',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!child) return res.status(404).json({ message: 'Child not found' });

    if (user.role === 'parent' && child.parentId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (
      user.role === 'teacher' &&
      (!child.groups || !child.groups.some((g) => g.teacherId === user.id))
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Подгружаем занятия отдельно
    const groupIds = (child.groups || []).map((g) => g.id);
    let lessonsByGroup = {};
    if (groupIds.length > 0) {
      const lessons = await Lesson.findAll({
        where: { groupId: { [Op.in]: groupIds } },
        attributes: ['id', 'date', 'startTime', 'endTime', 'topic', 'groupId'],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
      lessons.forEach((l) => {
        if (!lessonsByGroup[l.groupId]) lessonsByGroup[l.groupId] = [];
        lessonsByGroup[l.groupId].push({
          id: l.id,
          date: l.date,
          startTime: l.startTime,
          endTime: l.endTime,
          topic: l.topic,
        });
      });
    }

    const plain = child.toJSON();
    plain.groups = (plain.groups || []).map((g) => ({
      ...g,
      lessons: lessonsByGroup[g.id] || [],
    }));

    res.json(plain);
  } catch (error) {
    next(error);
  }
};

// POST /children
exports.createChild = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, birthDate } = req.body;

    let parentId = user.id;
    if (user.role === 'admin' && req.body.parentId) {
      parentId = req.body.parentId;
    } else if (user.role !== 'parent') {
      return res.status(400).json({ message: 'Parent ID required for admin' });
    }

    const child = await Child.create({ name, birthDate, parentId });
    res.status(201).json(child);
  } catch (error) {
    next(error);
  }
};

// PATCH /children/:id
exports.updateChild = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const child = await Child.findByPk(id);
    if (!child) return res.status(404).json({ message: 'Child not found' });

    if (user.role === 'parent' && child.parentId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, birthDate } = req.body;
    await child.update({ name, birthDate });
    res.json(child);
  } catch (error) {
    next(error);
  }
};

// DELETE /children/:id
exports.deleteChild = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const child = await Child.findByPk(id);
    if (!child) return res.status(404).json({ message: 'Child not found' });

    if (user.role === 'parent' && child.parentId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await child.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};