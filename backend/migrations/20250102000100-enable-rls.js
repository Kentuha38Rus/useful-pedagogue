'use strict';

/**
 * Включаем Row-Level Security на всех таблицах с tenantId / tenant_id.
 *
 * Для каждой таблицы:
 *   1. ENABLE ROW LEVEL SECURITY
 *   2. FORCE ROW LEVEL SECURITY (чтобы политика применялась и к владельцу таблицы)
 *   3. CREATE POLICY tenant_isolation
 *      USING (
 *        current_setting('app.tenant_id', true) IS NULL
 *        OR current_setting('app.tenant_id', true) = ''
 *        OR "tenantId" = current_setting('app.tenant_id', true)::uuid
 *      )
 *      WITH CHECK (то же условие)
 *
 * Условие "IS NULL OR = ''" разрешает доступ, когда контекст не установлен.
 * Это нужно для:
 *   - миграций (они выполняются без tenant_id)
 *   - platform_admin (tenantId = null)
 *   - фоновых задач, которые работают глобально
 *
 * Для продакшена рекомендуется создать отдельную роль БД без прав владельца
 * и без BYPASSRLS, чтобы это ослабление не действовало для приложения.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
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

    const allTables = [
      ...camelTables.map((t) => ({ name: t, column: 'tenantId' })),
      ...snakeTables.map((t) => ({ name: t, column: 'tenant_id' })),
    ];

    for (const { name, column } of allTables) {
      // 1. Включаем RLS
      await queryInterface.sequelize.query(`
        ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY;
      `);

      // 2. FORCE — чтобы RLS применялся и к владельцу таблицы
      await queryInterface.sequelize.query(`
        ALTER TABLE "${name}" FORCE ROW LEVEL SECURITY;
      `);

      // 3. Политика
      await queryInterface.sequelize.query(`
        CREATE POLICY tenant_isolation ON "${name}"
        USING (
          current_setting('app.tenant_id', true) IS NULL
          OR current_setting('app.tenant_id', true) = ''
          OR "${column}" = current_setting('app.tenant_id', true)::uuid
        )
        WITH CHECK (
          current_setting('app.tenant_id', true) IS NULL
          OR current_setting('app.tenant_id', true) = ''
          OR "${column}" = current_setting('app.tenant_id', true)::uuid
        );
      `);
    }

    // Таблица tenants не имеет tenantId, RLS на ней не включаем.
  },

  async down(queryInterface) {
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

    const allTables = [
      ...camelTables.map((t) => ({ name: t })),
      ...snakeTables.map((t) => ({ name: t })),
    ];

    for (const { name } of allTables) {
      await queryInterface.sequelize.query(`
        DROP POLICY IF EXISTS tenant_isolation ON "${name}";
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "${name}" DISABLE ROW LEVEL SECURITY;
      `);
    }
  },
};