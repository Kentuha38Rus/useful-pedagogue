const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lesson = sequelize.define('Lesson', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // 👇 Явно — нужен для составного уникального индекса
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Groups', key: 'id' },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    topic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // 👇 Отменённые занятия остаются в БД, но не показываются и не напоминают
    is_cancelled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    timestamps: true,
    indexes: [
      // Защита от дублей: одно занятие в группе на конкретную дату+время
      { unique: true, fields: ['groupId', 'date', 'startTime'] },
      { fields: ['date'] },
      { fields: ['is_cancelled'] },
    ],
  });

  return Lesson;
};