const Joi = require('joi');

const lessonSchema = Joi.object({
  date: Joi.date().iso().required(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).required(),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).required(),
  topic: Joi.string().allow('', null).optional(),
});

const schemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(50).optional(),
    password: Joi.string().min(8).max(128).required(),
    name: Joi.string().min(1).max(120).required(),
    email: Joi.string().email().optional(),
    phone: Joi.string().max(30).optional(),
    // role НЕ принимаем — публичная регистрация всегда parent
  }).or('username', 'email'),

  login: Joi.object({
    identifier: Joi.string().optional(),
    email: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().required(),
  }).or('identifier', 'email', 'username'),

  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  logout: Joi.object({
    refreshToken: Joi.string().optional(),
  }),

  updateUser: Joi.object({
    name: Joi.string().min(1).max(120).optional(),
    phone: Joi.string().max(30).optional(),
    email: Joi.string().email().optional(),
    username: Joi.string().alphanum().min(3).max(50).optional(),
  }),

  createChild: Joi.object({
    name: Joi.string().min(1).max(120).required(),
    birthDate: Joi.date().iso().optional(),
    // parentId НЕ принимаем — берётся из JWT в контроллере
  }),

  updateChild: Joi.object({
    name: Joi.string().min(1).max(120).optional(),
    birthDate: Joi.date().iso().optional(),
  }),

  createCourse: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(5000).optional(),
    price: Joi.number().min(0).optional(),
  }),

  updateCourse: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(5000).optional(),
    price: Joi.number().min(0).optional(),
  }),

  createGroup: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    courseId: Joi.string().uuid().required(),
    teacherId: Joi.string().uuid().required(),
    schedule: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
    maxStudents: Joi.number().integer().positive().optional(),
    lessons: Joi.array().items(lessonSchema).optional(),
  }),

  updateGroup: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    courseId: Joi.string().uuid().optional(),
    teacherId: Joi.string().uuid().optional(),
    schedule: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
    maxStudents: Joi.number().integer().positive().optional(),
    lessons: Joi.array().items(lessonSchema).optional(),
  }),

  createLesson: Joi.object({
    groupId: Joi.string().uuid().required(),
    date: Joi.date().iso().required(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).required(),
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).required(),
    topic: Joi.string().max(1000).optional(),
  }),

  attendance: Joi.object({
    attendances: Joi.array().items(
      Joi.object({
        childId: Joi.string().uuid().required(),
        status: Joi.string().valid('present', 'absent', 'late').required(),
      })
    ).min(1).required(),
  }),
};

const validate = (schemaName) => (req, res, next) => {
  const schema = schemas[schemaName];
  if (!schema) return next();
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
};

module.exports = validate;