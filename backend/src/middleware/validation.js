const Joi = require('joi');

const schemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().required(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    role: Joi.string().valid('parent', 'teacher', 'admin').default('parent'),
  }),
  login: Joi.object({
    identifier: Joi.string().required(), // может быть username или email
    password: Joi.string().required(),
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  updateUser: Joi.object({
    name: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    username: Joi.string().alphanum().min(3).max(50).optional(),
  }),
  createChild: Joi.object({
    name: Joi.string().required(),
    birthDate: Joi.date().iso().optional(),
    groupId: Joi.string().uuid().optional(),
  }),
  updateChild: Joi.object({
    name: Joi.string().optional(),
    birthDate: Joi.date().iso().optional(),
    groupId: Joi.string().uuid().optional(),
  }),
  createCourse: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    price: Joi.number().positive().optional(),
  }),
  updateCourse: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    price: Joi.number().positive().optional(),
  }),
  createGroup: Joi.object({
    name: Joi.string().required(),
    courseId: Joi.string().uuid().required(),
    teacherId: Joi.string().uuid().required(),
    schedule: Joi.object().optional(),
    maxStudents: Joi.number().integer().positive().optional(),
  }),
  updateGroup: Joi.object({
    name: Joi.string().optional(),
    courseId: Joi.string().uuid().optional(),
    teacherId: Joi.string().uuid().optional(),
    schedule: Joi.object().optional(),
    maxStudents: Joi.number().integer().positive().optional(),
  }),
  createLesson: Joi.object({
    groupId: Joi.string().uuid().required(),
    date: Joi.date().iso().required(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    topic: Joi.string().optional(),
  }),
  attendance: Joi.object({
    attendances: Joi.array().items(Joi.object({
      childId: Joi.string().uuid().required(),
      status: Joi.string().valid('present', 'absent', 'late').required(),
    })).min(1).required(),
  }),
};

const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return next();
    }
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.details.map(d => d.message),
      });
    }
    req.body = value;
    next();
  };
};

module.exports = validate;