const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinanceCategory = sequelize.define('FinanceCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    name: { type: DataTypes.STRING(120), allowNull: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'finance_categories',
    timestamps: true,
  });

  return FinanceCategory;
};
