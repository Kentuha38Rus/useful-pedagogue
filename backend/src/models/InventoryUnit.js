const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryUnit = sequelize.define('InventoryUnit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    inventoryNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    serialNumber: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('in_use', 'repair', 'written_off', 'lost'),
      allowNull: false,
      defaultValue: 'in_use',
    },
    condition: {
      type: DataTypes.ENUM('new', 'good', 'wear', 'broken'),
      allowNull: false,
      defaultValue: 'good',
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    responsibleUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    supplier: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    warrantyUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'inventory_units',
    timestamps: true,
  });

  return InventoryUnit;
};
