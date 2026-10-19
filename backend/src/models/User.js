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
      allowNull: true,   // теперь может быть null (если регистрируются только по email)
      unique: true,
      validate: {
        len: [3, 50],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
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
    hooks: {
      beforeCreate: (user) => {
        if (user.email) user.email = user.email.toLowerCase();
        if (user.username) user.username = user.username.toLowerCase();
      },
      beforeUpdate: (user) => {
        if (user.changed('email') && user.email) {
          user.email = user.email.toLowerCase();
        }
        if (user.changed('username') && user.username) {
          user.username = user.username.toLowerCase();
        }
      },
    },
  });

  return User;
};