const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChildGroup = sequelize.define('ChildGroup', {
    childId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'Children', key: 'id' },
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: { model: 'Groups', key: 'id' },
    },
  }, {
    timestamps: true,
    tableName: 'ChildGroups',
  });

  return ChildGroup;
};