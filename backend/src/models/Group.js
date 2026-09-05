const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Group = sequelize.define('Group', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    schedule: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    maxStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,    // временно разрешаем NULL для совместимости
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  }, {
    timestamps: true,
  });

  // ❌ ВСЕ АССОЦИАЦИИ УЖЕ ОПРЕДЕЛЕНЫ В index.js — НЕ ДОБАВЛЯЙТЕ ИХ ЗДЕСЬ!
  return Group;
};