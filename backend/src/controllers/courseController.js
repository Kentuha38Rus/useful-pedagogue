const { Course } = require('../models');
const { requireTenant } = require('../utils/helpers');

exports.getCourses = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const courses = await Course.findAll({ where: { tenantId: tid } });
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const course = await Course.findOne({ where: { id, tenantId: tid } });
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
    const tid = requireTenant(req);
    const { name, description, price } = req.body;
    const course = await Course.create({ tenantId: tid, name, description, price });
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const course = await Course.findOne({ where: { id, tenantId: tid } });
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
    const tid = requireTenant(req);
    const { id } = req.params;
    const course = await Course.findOne({ where: { id, tenantId: tid } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    await course.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};