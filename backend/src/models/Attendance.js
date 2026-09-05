const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late'),
      allowNull: false,
      defaultValue: 'absent',
    },
  }, {
    timestamps: true,
  });

  return Attendance;
};