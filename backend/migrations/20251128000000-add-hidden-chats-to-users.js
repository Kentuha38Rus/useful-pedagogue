'use strict';

/**
 * Личная история чатов: какие чаты пользователь удалил у себя.
 * Хранит объект { [chatId]: ISO-дата удаления }.
 * У собеседника история не удаляется.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'hiddenChats', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'hiddenChats');
  },
};
