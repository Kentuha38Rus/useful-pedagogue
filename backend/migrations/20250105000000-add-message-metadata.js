'use strict';

/**
 * Структурированные данные сообщения: тип, lessonId/childId для кнопок
 * подтверждения присутствия в чате.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('messages', 'metadata');
  },
};
