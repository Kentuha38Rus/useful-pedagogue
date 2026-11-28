'use strict';

/**
 * Филиалы центра.
 *
 * Филиал — это свойство группы (Groups.branchId): занятия, дети, педагоги
 * и напоминания наследуют филиал через группу, поэтому их таблицы не меняются.
 *
 * Колонка branchId необязательная, а существующим группам проставляется
 * автоматически созданный филиал «Основной» — миграция не ломает старые данные.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ---------- Таблица филиалов ----------
    await queryInterface.createTable('branches', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(40),
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('branches', ['tenantId'], {
      name: 'branches_tenant_idx',
    });

    // Название филиала уникально внутри центра без учёта регистра.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX branches_tenant_name_uniq
      ON branches ("tenantId", lower(name));
    `);

    // ---------- RLS: как у остальных таблиц с tenantId ----------
    await queryInterface.sequelize.query(`
      ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE branches FORCE ROW LEVEL SECURITY;
    `);
    await queryInterface.sequelize.query(`
      CREATE POLICY tenant_isolation ON branches
      USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR "tenantId" = current_setting('app.tenant_id', true)::uuid
      )
      WITH CHECK (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR "tenantId" = current_setting('app.tenant_id', true)::uuid
      );
    `);

    // ---------- Привязка групп к филиалу ----------
    await queryInterface.addColumn('Groups', 'branchId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Groups', ['branchId'], {
      name: 'Groups_branchId_idx',
    });

    // ---------- Заполнение: по филиалу «Основной» на каждый центр ----------
    await queryInterface.sequelize.query(`
      INSERT INTO branches (id, "tenantId", name, "isActive", "createdAt", "updatedAt")
      SELECT uuid_generate_v4(), t.id, 'Основной', true, now(), now()
      FROM tenants t;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Groups" g
      SET "branchId" = b.id
      FROM branches b
      WHERE b."tenantId" = g."tenantId"
        AND g."branchId" IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Groups', 'Groups_branchId_idx');
    await queryInterface.removeColumn('Groups', 'branchId');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS branches CASCADE;');
  },
};
