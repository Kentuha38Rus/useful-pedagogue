const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Child = sequelize.define('Child', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Groups',
        key: 'id',
      },
    },
  }, {
    timestamps: true,
  });

  return Child;
};