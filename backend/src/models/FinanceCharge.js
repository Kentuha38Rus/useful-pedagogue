const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinanceCharge = sequelize.define('FinanceCharge', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    childId: { type: DataTypes.UUID, allowNull: false },
    groupId: { type: DataTypes.UUID, allowNull: true },
    period: { type: DataTypes.STRING(7), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'finance_charges',
    timestamps: true,
  });

  return FinanceCharge;
};
