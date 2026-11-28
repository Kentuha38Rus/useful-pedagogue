const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinanceTransaction = sequelize.define('FinanceTransaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    categoryId: { type: DataTypes.UUID, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    occurredAt: { type: DataTypes.DATEONLY, allowNull: false },
    method: {
      type: DataTypes.ENUM('cash', 'card', 'transfer', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    comment: { type: DataTypes.TEXT, allowNull: true },
    source: {
      type: DataTypes.ENUM('manual', 'payment', 'salary', 'inventory'),
      allowNull: false,
      defaultValue: 'manual',
    },
    sourceId: { type: DataTypes.UUID, allowNull: true },
    period: { type: DataTypes.STRING(7), allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
  }, {
    tableName: 'finance_transactions',
    timestamps: true,
  });

  return FinanceTransaction;
};
