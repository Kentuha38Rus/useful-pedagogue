'use strict';

/**
 * Замена преподавателя на конкретном занятии.
 * Основной преподаватель остаётся в группе, а на дату можно назначить другого.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Lessons', 'substituteTeacherId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Lessons', ['substituteTeacherId'], {
      name: 'lessons_substitute_teacher_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'Lessons',
      'lessons_substitute_teacher_idx'
    );
    await queryInterface.removeColumn('Lessons', 'substituteTeacherId');
  },
};
