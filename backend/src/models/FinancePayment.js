const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinancePayment = sequelize.define('FinancePayment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    childId: { type: DataTypes.UUID, allowNull: false },
    chargeId: { type: DataTypes.UUID, allowNull: true },
    transactionId: { type: DataTypes.UUID, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    occurredAt: { type: DataTypes.DATEONLY, allowNull: false },
    method: {
      type: DataTypes.ENUM('cash', 'card', 'transfer', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    comment: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'finance_payments',
    timestamps: true,
  });

  return FinancePayment;
};
