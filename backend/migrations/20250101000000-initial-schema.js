'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Postgres: расширение для uuid_generate_v4() (используется как DEFAULT)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // ---------- Users ----------
    await queryInterface.createTable('Users', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: { type: DataTypes.STRING, allowNull: true, unique: true },
      email: { type: DataTypes.STRING, allowNull: true, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      role: {
        type: DataTypes.ENUM('admin', 'teacher', 'parent'),
        allowNull: false,
        defaultValue: 'parent',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- Children ----------
    await queryInterface.createTable('Children', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      birthDate: { type: DataTypes.DATEONLY, allowNull: true },
      parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- Courses ----------
    await queryInterface.createTable('Courses', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- Groups ----------
    await queryInterface.createTable('Groups', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      schedule: { type: DataTypes.JSONB, allowNull: true },
      maxStudents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      courseId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Courses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      teacherId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- Lessons ----------
    await queryInterface.createTable('Lessons', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      startTime: { type: DataTypes.TIME, allowNull: false },
      endTime: { type: DataTypes.TIME, allowNull: false },
      topic: { type: DataTypes.STRING, allowNull: true },
      is_cancelled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('Lessons', ['groupId', 'date', 'startTime'], {
      unique: true,
      name: 'lessons_groupid_date_starttime_unique',
    });
    await queryInterface.addIndex('Lessons', ['date'], { name: 'lessons_date_idx' });
    await queryInterface.addIndex('Lessons', ['is_cancelled'], { name: 'lessons_is_cancelled_idx' });

    // ---------- Attendances ----------
    await queryInterface.createTable('Attendances', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      status: {
        type: DataTypes.ENUM('present', 'absent', 'late'),
        allowNull: false,
        defaultValue: 'absent',
      },
      lessonId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Lessons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      childId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Children', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- ChildGroups (composite PK) ----------
    await queryInterface.createTable('ChildGroups', {
      childId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Children', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      groupId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'Groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- messages ----------
    await queryInterface.createTable('messages', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      chat_id: { type: DataTypes.STRING, allowNull: false },
      sender_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      content: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
      is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('messages', ['chat_id'], { name: 'messages_chat_id_idx' });

    // ---------- push_subscriptions ----------
    await queryInterface.createTable('push_subscriptions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      endpoint: { type: DataTypes.STRING, allowNull: false, unique: true },
      auth_key: { type: DataTypes.STRING, allowNull: false },
      p256dh_key: { type: DataTypes.STRING, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- notifications ----------
    await queryInterface.createTable('notifications', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: true },
      is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });

    // ---------- lesson_responses ----------
    await queryInterface.createTable('lesson_responses', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      lesson_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Lessons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      child_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Children', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      parent_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      admin_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: DataTypes.ENUM('pending', 'yes', 'no'),
        allowNull: false,
        defaultValue: 'pending',
      },
      responded_at: { type: DataTypes.DATE, allowNull: true },
      notified_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      timeout_notified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('lesson_responses', ['lesson_id', 'child_id'], {
      unique: true,
      name: 'lesson_responses_lesson_child_unique',
    });
    await queryInterface.addIndex('lesson_responses', ['parent_id'], { name: 'lesson_responses_parent_id_idx' });
    await queryInterface.addIndex('lesson_responses', ['admin_id'], { name: 'lesson_responses_admin_id_idx' });
    await queryInterface.addIndex('lesson_responses', ['status'], { name: 'lesson_responses_status_idx' });
  },

  async down(queryInterface) {
    // Обратный порядок — сначала зависимые
    await queryInterface.dropTable('lesson_responses');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('push_subscriptions');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('ChildGroups');
    await queryInterface.dropTable('Attendances');
    await queryInterface.dropTable('Lessons');
    await queryInterface.dropTable('Groups');
    await queryInterface.dropTable('Courses');
    await queryInterface.dropTable('Children');
    await queryInterface.dropTable('Users');

    // ENUM-типы в Postgres не удаляются вместе с таблицей
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Attendances_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lesson_responses_status";');
  },
};