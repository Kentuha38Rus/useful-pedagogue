const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LessonResponse = sequelize.define('LessonResponse', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lesson_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Lessons', key: 'id' },
    },
    child_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Children', key: 'id' },
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    // 👇 ЭТОГО ПОЛЯ НЕ ХВАТАЕТ
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('pending', 'yes', 'no'),
      allowNull: false,
      defaultValue: 'pending',
    },
    responded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notified_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    timeout_notified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'lesson_responses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['lesson_id', 'child_id'] },
      { fields: ['parent_id'] },
      { fields: ['admin_id'] },
      { fields: ['status'] },
    ],
  });

  return LessonResponse;
};