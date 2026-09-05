const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PushSubscription = sequelize.define('PushSubscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    auth_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    p256dh_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'push_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  PushSubscription.associate = (models) => {
    PushSubscription.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' });
  };

  return PushSubscription;
};