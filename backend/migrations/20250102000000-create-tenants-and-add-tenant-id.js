'use strict';

/**
 * Мультитенантность. Шаг 1: таблица tenants + tenant_id во всех доменных таблицах.
 *
 * - Создаёт таблицу `tenants` и дефолтный тенант для существующих данных.
 * - Добавляет tenant_id (nullable), бэкфилит, делает NOT NULL (кроме Users).
 * - Добавляет FK на tenants, индексы.
 * - Добавляет значение 'platform_admin' в ENUM ролей Users.
 * - CHECK: у Users tenant_id может быть NULL только у platform_admin.
 *
 * ВАЖНО: RLS в этой миграции НЕ включается — это Фаза 3.
 * После этой миграции приложение ОБЯЗАНО прокидывать tenantId вручную
 * (мы это сделаем в Фазе 3).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Фиксированный UUID дефолтного тенанта — используется в бэкфилле
    const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

    // ------------------------------------------------------------------
    // 1. Таблица tenants
    // ------------------------------------------------------------------
    await queryInterface.createTable('tenants', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      slug: { type: DataTypes.STRING(63), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'trial'),
        allowNull: false,
        defaultValue: 'active',
      },
      plan: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'basic' },
      settings: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ------------------------------------------------------------------
    // 2. Дефолтный тенант (на него повесим все существующие записи)
    // ------------------------------------------------------------------
    await queryInterface.bulkInsert('tenants', [{
      id: DEFAULT_TENANT_ID,
      slug: 'default',
      name: 'Default Tenant',
      status: 'active',
      plan: 'basic',
      settings: JSON.stringify({}),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    // ------------------------------------------------------------------
    // 3. Добавляем tenant_id во все доменные таблицы (пока NULLABLE)
    //
    //   camelCase-таблицы (исторически): Users, Children, Courses, Groups,
    //     Lessons, Attendances, ChildGroups  →  колонка "tenantId"
    //   snake_case-таблицы (новые): messages, push_subscriptions,
    //     notifications, lesson_responses    →  колонка "tenant_id"
    // ------------------------------------------------------------------
    const camelTables = [
      'Users',
      'Children',
      'Courses',
      'Groups',
      'Lessons',
      'Attendances',
      'ChildGroups',
    ];
    const snakeTables = [
      'messages',
      'push_subscriptions',
      'notifications',
      'lesson_responses',
    ];

    for (const table of camelTables) {
      await queryInterface.addColumn(table, 'tenantId', {
        type: DataTypes.UUID,
        allowNull: true,
      });
    }
    for (const table of snakeTables) {
      await queryInterface.addColumn(table, 'tenant_id', {
        type: DataTypes.UUID,
        allowNull: true,
      });
    }

    // ------------------------------------------------------------------
    // 4. Бэкфилл: все существующие строки → дефолтный тенант
    // ------------------------------------------------------------------
    for (const table of camelTables) {
      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET "tenantId" = :tid WHERE "tenantId" IS NULL;`,
        { replacements: { tid: DEFAULT_TENANT_ID } }
      );
    }
    for (const table of snakeTables) {
      await queryInterface.sequelize.query(
        `UPDATE "${table}" SET tenant_id = :tid WHERE tenant_id IS NULL;`,
        { replacements: { tid: DEFAULT_TENANT_ID } }
      );
    }

    // ------------------------------------------------------------------
    // 5. NOT NULL (все, КРОМЕ Users — там nullable для platform_admin)
    // ------------------------------------------------------------------
    for (const table of [...camelTables, ...snakeTables]) {
      if (table === 'Users') continue;
      const col = camelTables.includes(table) ? 'tenantId' : 'tenant_id';
      await queryInterface.changeColumn(table, col, {
        type: DataTypes.UUID,
        allowNull: false,
      });
    }

    // ------------------------------------------------------------------
    // 6. FK на tenants.id
    // ------------------------------------------------------------------
    for (const table of [...camelTables, ...snakeTables]) {
      const col = camelTables.includes(table) ? 'tenantId' : 'tenant_id';
      await queryInterface.addConstraint(table, {
        fields: [col],
        type: 'foreign key',
        name: `fk_${table}_tenant`,
        references: { table: 'tenants', field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    // ------------------------------------------------------------------
    // 7. Индексы под типовые запросы
    // ------------------------------------------------------------------
    for (const table of [...camelTables, ...snakeTables]) {
      const col = camelTables.includes(table) ? 'tenantId' : 'tenant_id';
      await queryInterface.addIndex(table, [col], {
        name: `${table}_${col}_idx`,
      });
    }

    // Дополнительные составные индексы под самые частые запросы
    await queryInterface.addIndex('Users', ['tenantId', 'role'], {
      name: 'Users_tenantId_role_idx',
    });
    await queryInterface.addIndex('Children', ['tenantId', 'parentId'], {
      name: 'Children_tenantId_parentId_idx',
    });
    await queryInterface.addIndex('Groups', ['tenantId', 'teacherId'], {
      name: 'Groups_tenantId_teacherId_idx',
    });
    await queryInterface.addIndex('Lessons', ['tenantId', 'groupId', 'date'], {
      name: 'Lessons_tenantId_groupId_date_idx',
    });

    // ------------------------------------------------------------------
    // 8. Новое значение роли: platform_admin
    //    (PG 12+ поддерживает ADD VALUE в транзакции; у нас PG 15)
    // ------------------------------------------------------------------
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'platform_admin';`
    );

    // ------------------------------------------------------------------
    // 9. CHECK на Users: tenantId может быть NULL только для platform_admin
    // ------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
      ADD CONSTRAINT "chk_users_tenant_or_platform"
      CHECK (role = 'platform_admin' OR "tenantId" IS NOT NULL);
    `);
  },

  async down(queryInterface, Sequelize) {
    // Обратный порядок — по убыванию зависимостей.

    // 1. CHECK
    await queryInterface.sequelize.query(
      `ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "chk_users_tenant_or_platform";`
    );

    // 2. Составные индексы
    await queryInterface.removeIndex('Lessons', 'Lessons_tenantId_groupId_date_idx').catch(() => {});
    await queryInterface.removeIndex('Groups', 'Groups_tenantId_teacherId_idx').catch(() => {});
    await queryInterface.removeIndex('Children', 'Children_tenantId_parentId_idx').catch(() => {});
    await queryInterface.removeIndex('Users', 'Users_tenantId_role_idx').catch(() => {});

    // 3. Простые индексы + FK + колонки
    const camelTables = [
      'Users', 'Children', 'Courses', 'Groups',
      'Lessons', 'Attendances', 'ChildGroups',
    ];
    const snakeTables = [
      'messages', 'push_subscriptions', 'notifications', 'lesson_responses',
    ];

    for (const table of [...camelTables, ...snakeTables]) {
      const col = camelTables.includes(table) ? 'tenantId' : 'tenant_id';
      await queryInterface.removeIndex(table, `${table}_${col}_idx`).catch(() => {});
      await queryInterface.removeConstraint(table, `fk_${table}_tenant`).catch(() => {});
      await queryInterface.removeColumn(table, col);
    }

    // 4. Таблица tenants
    await queryInterface.dropTable('tenants');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tenants_status";');

    // ENUM value 'platform_admin' откатить нельзя без пересоздания типа —
    // оставляем как есть. Это безопасно: значение просто не используется.
  },
};