const { Child, Group, Lesson, User, Course } = require('../models');
const { Op } = require('sequelize');
const { requireTenant } = require('../utils/helpers');

// Пустые строки из формы храним как NULL, чтобы в карточке не было «пустых» значений
const normalizeText = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const normalizeAngles = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
};

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
            { model: Course, as: 'course', attributes: ['id', 'name'] },
            { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          ],
        },
        {
          model: User,
          as: 'parent',
          attributes: ['id', 'name', 'email', 'phone', 'username'],
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
// Создавать ребёнка может только администратор — сразу для выбранного родителя.
exports.createChild = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const role = req.effectiveRole || req.user.role;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can add children' });
    }

    const { parentId } = req.body;
    if (!parentId) {
      return res.status(400).json({ message: 'parentId is required' });
    }

    // Проверяем, что родитель в этом же тенанте
    const parent = await User.findOne({
      where: { id: parentId, tenantId: tid, role: 'parent' },
    });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    const photoConsent = Boolean(req.body.photoConsent);

    const child = await Child.create({
      tenantId: tid,
      parentId,
      surname: normalizeText(req.body.surname),
      name: normalizeText(req.body.name),
      birthDate: req.body.birthDate,
      diagnosis: normalizeText(req.body.diagnosis),
      allergies: normalizeText(req.body.allergies),
      contraindications: normalizeText(req.body.contraindications),
      photoConsent,
      photoAngles: photoConsent ? normalizeAngles(req.body.photoAngles) : [],
      extraInfo: normalizeText(req.body.extraInfo),
    });

    res.status(201).json(child);
  } catch (error) {
    next(error);
  }
};

// PATCH /children/:id
// Карточку ребёнка редактирует только администратор школы.
exports.updateChild = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const role = req.effectiveRole || req.user.role;

    const child = await Child.findOne({ where: { id, tenantId: tid } });
    if (!child) return res.status(404).json({ message: 'Child not found' });

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can edit children' });
    }

    const updates = {};
    const textFields = [
      'surname',
      'name',
      'diagnosis',
      'allergies',
      'contraindications',
      'extraInfo',
    ];
    for (const field of textFields) {
      if (req.body[field] !== undefined) {
        updates[field] = normalizeText(req.body[field]);
      }
    }
    if (req.body.birthDate !== undefined) {
      updates.birthDate = req.body.birthDate;
    }
    if (req.body.photoConsent !== undefined) {
      updates.photoConsent = Boolean(req.body.photoConsent);
    }
    if (req.body.photoAngles !== undefined) {
      updates.photoAngles = normalizeAngles(req.body.photoAngles);
    }
    if (updates.photoConsent === false) {
      updates.photoAngles = [];
    }

    await child.update(updates);
    res.json(child);
  } catch (error) {
    next(error);
  }
};

// DELETE /children/:id
// Удалять детей может только администратор.
exports.deleteChild = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const role = req.effectiveRole || req.user.role;

    const child = await Child.findOne({ where: { id, tenantId: tid } });
    if (!child) return res.status(404).json({ message: 'Child not found' });

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete children' });
    }

    await child.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};