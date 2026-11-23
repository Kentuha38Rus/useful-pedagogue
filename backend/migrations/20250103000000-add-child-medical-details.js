'use strict';

/**
 * Расширяем карточку ребёнка: фамилия, диагноз, аллергии, противопоказания,
 * разрешение на съёмку с ракурсами и дополнительная информация.
 * Заполняет эти поля администратор школы.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.addColumn('Children', 'surname', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Children', 'diagnosis', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Children', 'allergies', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Children', 'contraindications', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('Children', 'photoConsent', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('Children', 'photoAngles', {
      type: DataTypes.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('Children', 'extraInfo', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const columns = [
      'surname',
      'diagnosis',
      'allergies',
      'contraindications',
      'photoConsent',
      'photoAngles',
      'extraInfo',
    ];

    for (const column of columns) {
      await queryInterface.removeColumn('Children', column);
    }
  },
};
