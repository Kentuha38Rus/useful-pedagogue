const { Child, Group, Lesson, User } = require('../models');
const { Op } = require('sequelize');
const { requireTenant } = require('../utils/helpers');

// GET /children
// parent  → только свои дети (в своём тенанте)
// teacher → дети из групп, где он teacher (в своём тенанте)
// admin   → все дети в своём тенанте
exports.getChildren = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const user = req.user;

    const where = { tenantId: tid };
    let groupWhere;
    let groupRequired = false;

    if (user.role === 'parent') {
      where.parentId = user.id;
    } else if (user.role === 'teacher') {
      groupWhere = { teacherId: user.id, tenantId: tid };
      groupRequired = true;
    }

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

    const groupIds = new Set();
    children.forEach((child) => {
      (child.groups || []).forEach((g) => groupIds.add(g.id));
    });

    let lessons = [];
    if (groupIds.size > 0) {
      lessons = await Lesson.findAll({
        where: {
          tenantId: tid,
          groupId: { [Op.in]: Array.from(groupIds) },
        },
        attributes: ['id', 'date', 'startTime', 'endTime', 'topic', 'groupId'],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
    }

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
    const tid = requireTenant(req);
    const { id } = req.params;
    const user = req.user;

    const child = await Child.findOne({
      where: { id, tenantId: tid },
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

    const groupIds = (child.groups || []).map((g) => g.id);
    let lessonsByGroup = {};
    if (groupIds.length > 0) {
      const lessons = await Lesson.findAll({
        where: { tenantId: tid, groupId: { [Op.in]: groupIds } },
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
    const tid = requireTenant(req);
    const user = req.user;
    const { name, birthDate } = req.body;

    let parentId = user.id;
    if (user.role === 'admin' && req.body.parentId) {
      // Проверяем, что родитель в этом же тенанте
      const parent = await User.findOne({
        where: { id: req.body.parentId, tenantId: tid },
      });
      if (!parent) {
        return res.status(404).json({ message: 'Parent not found' });
      }
      parentId = req.body.parentId;
    } else if (user.role !== 'parent') {
      return res.status(400).json({ message: 'Parent ID required for admin' });
    }

    const child = await Child.create({ tenantId: tid, name, birthDate, parentId });
    res.status(201).json(child);
  } catch (error) {
    next(error);
  }
};

// PATCH /children/:id
exports.updateChild = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const user = req.user;

    const child = await Child.findOne({ where: { id, tenantId: tid } });
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
    const tid = requireTenant(req);
    const { id } = req.params;
    const user = req.user;

    const child = await Child.findOne({ where: { id, tenantId: tid } });
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