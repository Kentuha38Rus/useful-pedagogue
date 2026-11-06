const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(63),
      allowNull: false,
      unique: true,
      validate: {
        // DNS-safe slug: только буквы/цифры/дефис, не начинается/заканчивается дефисом
        is: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
        len: [2, 63],
      },
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'trial'),
      allowNull: false,
      defaultValue: 'active',
    },
    plan: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'basic',
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    tableName: 'tenants',
    timestamps: true,
    hooks: {
      beforeValidate: (tenant) => {
        if (tenant.slug) tenant.slug = tenant.slug.toLowerCase().trim();
      },
    },
  });

  return Tenant;
};