'use strict';

/**
 * Финансовый учёт центра: доходы, расходы, начисления и оплаты родителей.
 *
 * Только новые таблицы. Филиал берётся из branches.
 * Денежный поток = операции (finance_transactions); оплаты родителей
 * автоматически создают доходную операцию.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.literal('CURRENT_TIMESTAMP');

    await queryInterface.createTable('finance_categories', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false,
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable('finance_transactions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false,
      },
      categoryId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'finance_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      occurredAt: { type: Sequelize.DATEONLY, allowNull: false },
      method: {
        type: Sequelize.ENUM('cash', 'card', 'transfer', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      comment: { type: Sequelize.TEXT, allowNull: true },
      source: {
        type: Sequelize.ENUM('manual', 'payment', 'salary', 'inventory'),
        allowNull: false,
        defaultValue: 'manual',
      },
      sourceId: { type: Sequelize.UUID, allowNull: true },
      period: { type: Sequelize.STRING(7), allowNull: true },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable('finance_charges', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      childId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Children', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      groupId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      period: { type: Sequelize.STRING(7), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      comment: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable('finance_payments', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      childId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Children', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      chargeId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'finance_charges', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      transactionId: { type: Sequelize.UUID, allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      occurredAt: { type: Sequelize.DATEONLY, allowNull: false },
      method: {
        type: Sequelize.ENUM('cash', 'card', 'transfer', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      comment: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    // ---------- Индексы ----------
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX fin_categories_tenant_type_name_uniq
      ON finance_categories ("tenantId", type, lower(name));
    `);

    await queryInterface.addIndex('finance_transactions', ['tenantId', 'occurredAt'], {
      name: 'fin_tx_tenant_date_idx',
    });
    await queryInterface.addIndex('finance_transactions', ['tenantId', 'type'], {
      name: 'fin_tx_tenant_type_idx',
    });
    await queryInterface.addIndex('finance_transactions', ['tenantId', 'branchId'], {
      name: 'fin_tx_tenant_branch_idx',
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX fin_charges_child_group_period_uniq
      ON finance_charges ("childId", "groupId", period);
    `);
    await queryInterface.addIndex('finance_charges', ['tenantId', 'period'], {
      name: 'fin_charges_tenant_period_idx',
    });

    await queryInterface.addIndex('finance_payments', ['tenantId', 'occurredAt'], {
      name: 'fin_pay_tenant_date_idx',
    });
    await queryInterface.addIndex('finance_payments', ['tenantId', 'childId'], {
      name: 'fin_pay_tenant_child_idx',
    });

    // ---------- RLS ----------
    const tables = [
      'finance_categories',
      'finance_transactions',
      'finance_charges',
      'finance_payments',
    ];

    for (const table of tables) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;
      `);
      await queryInterface.sequelize.query(`
        CREATE POLICY tenant_isolation ON "${table}"
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
    }
  },

  async down(queryInterface) {
    const tables = [
      'finance_payments',
      'finance_charges',
      'finance_transactions',
      'finance_categories',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table, { cascade: true });
    }

    const enumTypes = [
      'enum_finance_categories_type',
      'enum_finance_transactions_type',
      'enum_finance_transactions_method',
      'enum_finance_transactions_source',
      'enum_finance_payments_method',
    ];
    for (const type of enumTypes) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}" CASCADE;`);
    }
  },
};
