const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryIssue = sequelize.define('InventoryIssue', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    unitId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('breakdown', 'missing', 'need_purchase', 'other'),
      allowNull: false,
      defaultValue: 'breakdown',
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('new', 'in_progress', 'resolved', 'rejected'),
      allowNull: false,
      defaultValue: 'new',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolutionComment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'inventory_issues',
    timestamps: true,
  });

  return InventoryIssue;
};
