const { Course } = require('../models');

exports.getCourses = async (req, res, next) => {
  try {
    const courses = await Course.findAll();
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    next(error);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const { name, description, price } = req.body;
    const course = await Course.create({ name, description, price });
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const { name, description, price } = req.body;
    await course.update({ name, description, price });
    res.json(course);
  } catch (error) {
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    await course.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};