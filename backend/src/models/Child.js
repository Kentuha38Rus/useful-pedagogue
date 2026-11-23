const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Child = sequelize.define('Child', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    surname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Медицинская карта ребёнка (заполняет администратор)
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contraindications: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Разрешение на съёмку и ракурсы (если разрешение есть)
    photoConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    photoAngles: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    extraInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    timestamps: true,
  });

  return Child;
};