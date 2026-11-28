const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryItem = sequelize.define('InventoryItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    // unit — поштучный учёт, bulk — учёт по количеству (расходники)
    kind: {
      type: DataTypes.ENUM('unit', 'bulk'),
      allowNull: false,
      defaultValue: 'unit',
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'шт',
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    minQuantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'inventory_items',
    timestamps: true,
  });

  return InventoryItem;
};
