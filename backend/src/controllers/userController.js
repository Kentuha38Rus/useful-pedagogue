const { User } = require('../models');

exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const { passwordHash, ...userData } = user.toJSON();
    res.json(userData);
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, phone, email } = req.body;
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    await user.update({ name, phone, email });
    const { passwordHash, ...userData } = user.toJSON();
    res.json(userData);
  } catch (error) {
    next(error);
  }
};

exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: { exclude: ['passwordHash'] },
    });
    res.json(teachers);
  } catch (error) {
    next(error);
  }
};