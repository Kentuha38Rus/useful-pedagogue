const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const Tenant = require('./Tenant')(sequelize, Sequelize.DataTypes);
const Branch = require('./Branch')(sequelize, Sequelize.DataTypes);
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
const InventoryCategory = require('./InventoryCategory')(sequelize, Sequelize.DataTypes);
const InventoryItem = require('./InventoryItem')(sequelize, Sequelize.DataTypes);
const InventoryUnit = require('./InventoryUnit')(sequelize, Sequelize.DataTypes);
const InventoryBalance = require('./InventoryBalance')(sequelize, Sequelize.DataTypes);
const InventoryMovement = require('./InventoryMovement')(sequelize, Sequelize.DataTypes);
const InventoryIssue = require('./InventoryIssue')(sequelize, Sequelize.DataTypes);

// ---- Связь с тенантом (для всех доменных сущностей) ----
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Child, { foreignKey: 'tenantId', as: 'children' });
Child.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Course, { foreignKey: 'tenantId', as: 'courses' });
Course.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Group, { foreignKey: 'tenantId', as: 'groups' });
Group.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// ---- Филиалы ----
Tenant.hasMany(Branch, { foreignKey: 'tenantId', as: 'branches' });
Branch.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Branch.hasMany(Group, { foreignKey: 'branchId', as: 'groups' });
Group.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

Tenant.hasMany(Lesson, { foreignKey: 'tenantId', as: 'lessons' });
Lesson.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Attendance, { foreignKey: 'tenantId', as: 'attendances' });
Attendance.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// snake_case-таблицы используют "tenant_id"
Tenant.hasMany(Message, { foreignKey: 'tenant_id', as: 'messages' });
Message.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(Notification, { foreignKey: 'tenant_id', as: 'notifications' });
Notification.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(PushSubscription, { foreignKey: 'tenant_id', as: 'pushSubscriptions' });
PushSubscription.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.hasMany(LessonResponse, { foreignKey: 'tenant_id', as: 'lessonResponses' });
LessonResponse.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// ---- Доменные связи (были) ----
User.hasMany(Child, { foreignKey: 'parentId', as: 'children' });
Child.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });

User.hasMany(Group, { foreignKey: 'teacherId', as: 'groups' });
Group.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

Course.hasMany(Group, { foreignKey: 'courseId', as: 'groups' });
Group.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Group.hasMany(Lesson, { foreignKey: 'groupId', as: 'lessons' });
Lesson.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

// Замена преподавателя на конкретном занятии
User.hasMany(Lesson, { foreignKey: 'substituteTeacherId', as: 'substitutedLessons' });
Lesson.belongsTo(User, { foreignKey: 'substituteTeacherId', as: 'substituteTeacher' });

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

// ---- Учёт материальных ценностей ----
Tenant.hasMany(InventoryCategory, { foreignKey: 'tenantId', as: 'inventoryCategories' });
InventoryCategory.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(InventoryItem, { foreignKey: 'tenantId', as: 'inventoryItems' });
InventoryItem.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(InventoryUnit, { foreignKey: 'tenantId', as: 'inventoryUnits' });
InventoryUnit.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(InventoryBalance, { foreignKey: 'tenantId', as: 'inventoryBalances' });
InventoryBalance.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(InventoryMovement, { foreignKey: 'tenantId', as: 'inventoryMovements' });
InventoryMovement.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(InventoryIssue, { foreignKey: 'tenantId', as: 'inventoryIssues' });
InventoryIssue.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

InventoryCategory.hasMany(InventoryItem, { foreignKey: 'categoryId', as: 'items' });
InventoryItem.belongsTo(InventoryCategory, { foreignKey: 'categoryId', as: 'category' });

InventoryItem.hasMany(InventoryUnit, { foreignKey: 'itemId', as: 'units' });
InventoryUnit.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });

InventoryItem.hasMany(InventoryBalance, { foreignKey: 'itemId', as: 'balances' });
InventoryBalance.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });

Branch.hasMany(InventoryUnit, { foreignKey: 'branchId', as: 'inventoryUnits' });
InventoryUnit.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

Branch.hasMany(InventoryBalance, { foreignKey: 'branchId', as: 'inventoryBalances' });
InventoryBalance.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

User.hasMany(InventoryUnit, { foreignKey: 'responsibleUserId', as: 'responsibleUnits' });
InventoryUnit.belongsTo(User, { foreignKey: 'responsibleUserId', as: 'responsible' });

InventoryMovement.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });
InventoryMovement.belongsTo(InventoryUnit, { foreignKey: 'unitId', as: 'unit' });
InventoryMovement.belongsTo(Branch, { foreignKey: 'fromBranchId', as: 'fromBranch' });
InventoryMovement.belongsTo(Branch, { foreignKey: 'toBranchId', as: 'toBranch' });
InventoryMovement.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });

InventoryIssue.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
InventoryIssue.belongsTo(InventoryItem, { foreignKey: 'itemId', as: 'item' });
InventoryIssue.belongsTo(InventoryUnit, { foreignKey: 'unitId', as: 'unit' });
InventoryIssue.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });
InventoryIssue.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });

const db = {
  Tenant,
  Branch,
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
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
  InventoryBalance,
  InventoryMovement,
  InventoryIssue,
};

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) db[modelName].associate(db);
});

module.exports = {
  ...db,
  sequelize,
  Sequelize,
};