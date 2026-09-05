const { User, Child, Group, Course, Lesson, Attendance, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

class AdminController {
  // Статистика для дашборда
  static async getStats(req, res, next) {
    try {
      const totalUsers = await User.count();
      const totalTeachers = await User.count({ where: { role: 'teacher' } });
      const totalParents = await User.count({ where: { role: 'parent' } });
      const totalChildren = await Child.count();
      const totalGroups = await Group.count();
      const totalCourses = await Course.count();
      const totalLessons = await Lesson.count();
      const unassignedChildren = await Child.count({ where: { groupId: null } });

      res.status(200).json({
        totalUsers,
        totalTeachers,
        totalParents,
        totalChildren,
        totalGroups,
        totalCourses,
        totalLessons,
        unassignedChildren,
      });
    } catch (error) {
      next(error);
    }
  }

  // getAllUsers – добавлен поиск по username
  static async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      const offset = (page - 1) * limit;
      const where = {};
      if (role) where.role = role;
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['passwordHash'] },
        include: [
          {
            model: Child,
            as: 'children',
            attributes: ['id', 'name', 'birthDate'],
            include: [{ model: Group, as: 'group', attributes: ['id', 'name'] }],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.status(200).json({
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        users: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  // Детальная информация о пользователе
  static async getUserDetails(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id, {
        attributes: { exclude: ['passwordHash'] },
        include: [
          {
            model: Child,
            as: 'children',
            include: [
              { model: Group, as: 'group', include: [{ model: Course, as: 'course' }] },
              { model: Attendance, as: 'attendances' },
            ],
          },
          {
            model: Group,
            as: 'groups',
            include: [{ model: Course, as: 'course' }, { model: Child, as: 'children' }],
          },
        ],
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  // Обновление роли пользователя
  static async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!['admin', 'teacher', 'parent'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.role = role;
      await user.save();
      res.status(200).json({ message: 'Role updated', user: { id: user.id, role: user.role } });
    } catch (error) {
      next(error);
    }
  }

  // Создание пользователя (администратором) – теперь с username
  static async createUser(req, res, next) {
    try {
      const { username, email, password, name, phone, role } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ message: 'Username, password and name are required' });
      }
      if (!['admin', 'teacher', 'parent'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Проверка уникальности username
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Если email передан – проверяем уникальность
      if (email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const user = await User.create({
        username,
        email: email || null,
        passwordHash,
        name,
        phone: phone || null,
        role,
      });
      const { passwordHash: _, ...userData } = user.toJSON();
      res.status(201).json(userData);
    } catch (error) {
      next(error);
    }
  }

  // ----- НОВЫЙ МЕТОД: Удаление пользователя (с его детьми) -----
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Запрещаем удаление самого себя (администратор не может удалить себя)
      if (user.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      // Удаляем всех детей пользователя (если есть)
      await Child.destroy({ where: { parentId: user.id } });
      // Удаляем пользователя
      await user.destroy();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Получить все группы (с учителем, курсом, детьми и занятиями)
  static async getAllGroups(req, res, next) {
    try {
      const groups = await Group.findAll({
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
          { model: Child, as: 'children', attributes: ['id', 'name'] },
          { model: Lesson, as: 'lessons' },
        ],
        order: [['createdAt', 'DESC']],
      });
      res.status(200).json(groups);
    } catch (error) {
      console.error('Error in getAllGroups:', error);
      next(error);
    }
  }

  // Создать группу (с занятиями)
  static async createGroup(req, res, next) {
    try {
      const { courseId, teacherId, name, schedule, maxStudents, lessons } = req.body;

      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.status(400).json({ message: 'Course not found' });
      }
      const teacher = await User.findByPk(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ message: 'Invalid teacher' });
      }

      const group = await Group.create({
        courseId,
        teacherId,
        name,
        schedule: schedule || '{}',
        maxStudents: maxStudents || 10,
      });

      // Создаём занятия, если переданы
      if (lessons && Array.isArray(lessons) && lessons.length > 0) {
        const lessonData = lessons.map(lesson => ({
          groupId: group.id,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          topic: lesson.topic || null,
        }));
        await Lesson.bulkCreate(lessonData);
      }

      const createdGroup = await Group.findByPk(group.id, {
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
          { model: Child, as: 'children', attributes: ['id', 'name'] },
          { model: Lesson, as: 'lessons' },
        ],
      });
      res.status(201).json(createdGroup);
    } catch (error) {
      next(error);
    }
  }

  // Обновить группу (с занятиями)
  static async updateGroup(req, res, next) {
    try {
      const { id } = req.params;
      const group = await Group.findByPk(id);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const { courseId, teacherId, name, schedule, maxStudents, lessons } = req.body;

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
        courseId,
        teacherId,
        name,
        schedule: schedule || '{}',
        maxStudents: maxStudents || 10,
      });

      // Обновляем занятия: удаляем старые и создаём новые
      if (lessons !== undefined) {
        await Lesson.destroy({ where: { groupId: group.id } });
        if (lessons && Array.isArray(lessons) && lessons.length > 0) {
          const lessonData = lessons.map(lesson => ({
            groupId: group.id,
            date: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            topic: lesson.topic || null,
          }));
          await Lesson.bulkCreate(lessonData);
        }
      }

      const updatedGroup = await Group.findByPk(id, {
        include: [
          { model: User, as: 'teacher', attributes: ['id', 'name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
          { model: Child, as: 'children', attributes: ['id', 'name'] },
          { model: Lesson, as: 'lessons' },
        ],
      });
      res.status(200).json(updatedGroup);
    } catch (error) {
      next(error);
    }
  }

  // Удалить группу
  static async deleteGroup(req, res, next) {
    try {
      const { id } = req.params;
      const group = await Group.findByPk(id);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      await group.destroy();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Получить все курсы
  static async getAllCourses(req, res, next) {
    try {
      const courses = await Course.findAll({
        include: [{ model: Group, as: 'groups', include: [{ model: User, as: 'teacher' }] }],
        order: [['createdAt', 'DESC']],
      });
      res.status(200).json(courses);
    } catch (error) {
      next(error);
    }
  }

  // Создать курс
  static async createCourse(req, res, next) {
    try {
      const course = await Course.create(req.body);
      res.status(201).json(course);
    } catch (error) {
      next(error);
    }
  }

  // Обновить курс
  static async updateCourse(req, res, next) {
    try {
      const { id } = req.params;
      const course = await Course.findByPk(id);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      await course.update(req.body);
      res.status(200).json(course);
    } catch (error) {
      next(error);
    }
  }

  // Удалить курс
  static async deleteCourse(req, res, next) {
    try {
      const { id } = req.params;
      const course = await Course.findByPk(id);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      await course.destroy();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Заглушка платежей
  static async getPayments(req, res, next) {
    try {
      const children = await Child.findAll({
        include: [
          {
            model: Group,
            as: 'group',
            include: [{ model: Course, as: 'course' }],
          },
          { model: User, as: 'parent', attributes: ['id', 'name', 'email'] },
        ],
      });
      const payments = children.map(child => ({
        childId: child.id,
        childName: child.name,
        parentName: child.parent ? child.parent.name : null,
        groupName: child.group ? child.group.name : null,
        courseName: child.group && child.group.course ? child.group.course.name : null,
        price: child.group && child.group.course ? child.group.course.price : 0,
        status: 'pending',
      }));
      res.status(200).json(payments);
    } catch (error) {
      next(error);
    }
  }

  // Получить детей, не состоящих ни в одной группе
  static async getAvailableChildren(req, res, next) {
    try {
      const children = await Child.findAll({
        where: { groupId: null },
        include: [
          { model: User, as: 'parent', attributes: ['id', 'name', 'email'] }
        ],
        order: [['name', 'ASC']],
      });
      res.status(200).json(children);
    } catch (error) {
      next(error);
    }
  }

  // Добавить ребенка в группу
  static async addChildToGroup(req, res, next) {
    try {
      const { childId, groupId } = req.body;
      if (!childId || !groupId) {
        return res.status(400).json({ message: 'childId and groupId are required' });
      }

      const child = await Child.findByPk(childId);
      if (!child) {
        return res.status(404).json({ message: 'Child not found' });
      }

      const group = await Group.findByPk(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      const currentCount = await Child.count({ where: { groupId } });
      if (currentCount >= group.maxStudents) {
        return res.status(400).json({ message: 'Group is full' });
      }

      if (child.groupId && child.groupId !== groupId) {
        return res.status(400).json({ message: 'Child is already in another group' });
      }

      child.groupId = groupId;
      await child.save();

      const updatedChild = await Child.findByPk(childId, {
        include: [
          { model: Group, as: 'group' },
          { model: User, as: 'parent', attributes: ['id', 'name', 'email'] }
        ]
      });
      res.status(200).json(updatedChild);
    } catch (error) {
      next(error);
    }
  }

  // Удалить ребенка из группы
  static async removeChildFromGroup(req, res, next) {
    try {
      const { childId } = req.body;
      if (!childId) {
        return res.status(400).json({ message: 'childId is required' });
      }

      const child = await Child.findByPk(childId);
      if (!child) {
        return res.status(404).json({ message: 'Child not found' });
      }

      if (!child.groupId) {
        return res.status(400).json({ message: 'Child is not in any group' });
      }

      child.groupId = null;
      await child.save();

      res.status(200).json({ message: 'Child removed from group', child });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;