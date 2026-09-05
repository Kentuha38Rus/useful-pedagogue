const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: true, // только буквы и цифры (можно настроить)
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true, // теперь необязательное
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('admin', 'teacher', 'parent'),
      allowNull: false,
      defaultValue: 'parent',
    },
  }, {
    timestamps: true,
  });

  return User;
};