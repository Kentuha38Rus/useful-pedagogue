const { Child, Group, Lesson } = require('../models');

exports.getChildren = async (req, res, next) => {
  try {
    const user = req.user;
    let where = {};
    if (user.role === 'parent') {
      where.parentId = user.id;
    }
    const children = await Child.findAll({
      where,
      include: [
        {
          model: Group,
          as: 'group',
          include: [
            {
              model: Lesson,
              as: 'lessons',
              attributes: ['id', 'date', 'startTime', 'endTime', 'topic'],
              order: [['date', 'ASC'], ['startTime', 'ASC']]
            }
          ]
        }
      ]
    });
    res.json(children);
  } catch (error) {
    next(error);
  }
};

exports.getChildById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const child = await Child.findByPk(id, {
      include: [
        {
          model: Group,
          as: 'group',
          include: [{ model: Lesson, as: 'lessons' }]
        }
      ]
    });
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    if (user.role === 'parent' && child.parentId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(child);
  } catch (error) {
    next(error);
  }
};

exports.createChild = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, birthDate, groupId } = req.body;
    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) {
        return res.status(400).json({ message: 'Group not found' });
      }
    }
    let parentId = user.id;
    if (user.role === 'admin' && req.body.parentId) {
      parentId = req.body.parentId;
    } else if (user.role !== 'parent') {
      return res.status(400).json({ message: 'Parent ID required for admin' });
    }
    const child = await Child.create({ name, birthDate, parentId, groupId: groupId || null });
    res.status(201).json(child);
  } catch (error) {
    next(error);
  }
};

exports.updateChild = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const child = await Child.findByPk(id);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    if (user.role === 'parent' && child.parentId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { name, birthDate, groupId } = req.body;
    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) {
        return res.status(400).json({ message: 'Group not found' });
      }
    }
    await child.update({ name, birthDate, groupId: groupId || null });
    res.json(child);
  } catch (error) {
    next(error);
  }
};

exports.deleteChild = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const child = await Child.findByPk(id);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    if (user.role === 'parent' && child.parentId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await child.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};