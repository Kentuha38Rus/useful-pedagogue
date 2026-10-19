const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const User = require('./User')(sequelize, Sequelize.DataTypes);
const Child = require('./Child')(sequelize, Sequelize.DataTypes);
const Course = require('./Course')(sequelize, Sequelize.DataTypes);
const Group = require('./Group')(sequelize, Sequelize.DataTypes);
const Lesson = require('./Lesson')(sequelize, Sequelize.DataTypes);
const Attendance = require('./Attendance')(sequelize, Sequelize.DataTypes);
const Message = require('./Message')(sequelize, Sequelize.DataTypes);
const PushSubscription = require('./PushSubscription')(sequelize, Sequelize.DataTypes);
const Notification = require('./Notification')(sequelize, Sequelize.DataTypes);
const ChildGroup = require('./ChildGroup')(sequelize, Sequelize.DataTypes);
const LessonResponse = require('./LessonResponse')(sequelize, Sequelize.DataTypes);

// ---- Связи ----
User.hasMany(Child, { foreignKey: 'parentId', as: 'children' });
Child.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

User.hasMany(Group, { foreignKey: 'teacherId', as: 'groups' });
Group.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

Course.hasMany(Group, { foreignKey: 'courseId', as: 'groups' });
Group.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Group.hasMany(Lesson, { foreignKey: 'groupId', as: 'lessons' });
Lesson.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

// many-to-many
Child.belongsToMany(Group, {
  through: ChildGroup,
  foreignKey: 'childId',
  otherKey: 'groupId',
  as: 'groups',
});
Group.belongsToMany(Child, {
  through: ChildGroup,
  foreignKey: 'groupId',
  otherKey: 'childId',
  as: 'children',
});

Lesson.hasMany(Attendance, { foreignKey: 'lessonId', as: 'attendances' });
Attendance.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });

Child.hasMany(Attendance, { foreignKey: 'childId', as: 'attendances' });
Attendance.belongsTo(Child, { foreignKey: 'childId', as: 'child' });

// ---- LessonResponse ----
Lesson.hasMany(LessonResponse, { foreignKey: 'lesson_id', as: 'responses' });
LessonResponse.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });

Child.hasMany(LessonResponse, { foreignKey: 'child_id', as: 'lessonResponses' });
LessonResponse.belongsTo(Child, { foreignKey: 'child_id', as: 'child' });

User.hasMany(LessonResponse, { foreignKey: 'parent_id', as: 'lessonResponses' });
LessonResponse.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' });

const db = {
  User,
  Child,
  Course,
  Group,
  Lesson,
  Attendance,
  Message,
  PushSubscription,
  Notification,
  ChildGroup,
  LessonResponse,
};

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) db[modelName].associate(db);
});

module.exports = {
  ...db,
  sequelize,
  Sequelize,
};