'use strict';

/**
 * Учёт материальных ценностей центра.
 *
 * Только новые таблицы — существующие данные не меняются.
 * Филиал берётся из branches (уже есть). Педагоги видят имущество своих
 * филиалов через группы, отдельного поля у пользователя не нужно.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.literal('CURRENT_TIMESTAMP');

    await queryInterface.createTable('inventory_categories', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable('inventory_items', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      categoryId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'inventory_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      kind: {
        type: Sequelize.ENUM('unit', 'bulk'),
        allowNull: false,
        defaultValue: 'unit',
      },
      unit: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'шт' },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      minQuantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      note: { type: Sequelize.TEXT, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable('inventory_units', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      itemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'inventory_items', key: 'id' },
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
      inventoryNumber: { type: Sequelize.STRING(50), allowNull: false },
      serialNumber: { type: Sequelize.STRING(120), allowNull: true },
      status: {
        type: Sequelize.ENUM('in_use', 'repair', 'written_off', 'lost'),
        allowNull: false,
        defaultValue: 'in_use',
      },
      condition: {
        type: Sequelize.ENUM('new', 'good', 'wear', 'broken'),
        allowNull: false,
        defaultValue: 'good',
      },
      location: { type: Sequelize.STRING(200), allowNull: true },
      responsibleUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      purchaseDate: { type: Sequelize.DATEONLY, allowNull: true },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      supplier: { type: Sequelize.STRING(200), allowNull: true },
      warrantyUntil: { type: Sequelize.DATEONLY, allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable('inventory_balances', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      itemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'inventory_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable('inventory_movements', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kind: {
        type: Sequelize.ENUM(
          'receipt',
          'transfer',
          'write_off',
          'repair',
          'return',
          'inventory_check'
        ),
        allowNull: false,
      },
      itemId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'inventory_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      unitId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'inventory_units', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      fromBranchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      toBranchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      documentNumber: { type: Sequelize.STRING(60), allowNull: true },
      occurredAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
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

    await queryInterface.createTable('inventory_issues', {
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
      itemId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'inventory_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      unitId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'inventory_units', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.ENUM('breakdown', 'missing', 'need_purchase', 'other'),
        allowNull: false,
        defaultValue: 'breakdown',
      },
      comment: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM('new', 'in_progress', 'resolved', 'rejected'),
        allowNull: false,
        defaultValue: 'new',
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      resolvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      resolutionComment: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    // ---------- Индексы ----------
    await queryInterface.addIndex('inventory_categories', ['tenantId'], {
      name: 'inv_categories_tenant_idx',
    });
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX inv_categories_tenant_name_uniq
      ON inventory_categories ("tenantId", lower(name));
    `);

    await queryInterface.addIndex('inventory_items', ['tenantId', 'categoryId'], {
      name: 'inv_items_tenant_category_idx',
    });

    await queryInterface.addIndex('inventory_units', ['tenantId', 'branchId'], {
      name: 'inv_units_tenant_branch_idx',
    });
    await queryInterface.addIndex('inventory_units', ['tenantId', 'itemId'], {
      name: 'inv_units_tenant_item_idx',
    });
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX inv_units_tenant_number_uniq
      ON inventory_units ("tenantId", "inventoryNumber");
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX inv_balances_item_branch_uniq
      ON inventory_balances ("itemId", "branchId");
    `);
    await queryInterface.addIndex('inventory_balances', ['tenantId', 'branchId'], {
      name: 'inv_balances_tenant_branch_idx',
    });

    await queryInterface.addIndex('inventory_movements', ['tenantId', 'occurredAt'], {
      name: 'inv_movements_tenant_date_idx',
    });
    await queryInterface.addIndex('inventory_movements', ['tenantId', 'itemId'], {
      name: 'inv_movements_tenant_item_idx',
    });

    await queryInterface.addIndex('inventory_issues', ['tenantId', 'status'], {
      name: 'inv_issues_tenant_status_idx',
    });
    await queryInterface.addIndex('inventory_issues', ['tenantId', 'branchId'], {
      name: 'inv_issues_tenant_branch_idx',
    });

    // ---------- RLS ----------
    const tables = [
      'inventory_categories',
      'inventory_items',
      'inventory_units',
      'inventory_balances',
      'inventory_movements',
      'inventory_issues',
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
      'inventory_issues',
      'inventory_movements',
      'inventory_balances',
      'inventory_units',
      'inventory_items',
      'inventory_categories',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table, { cascade: true });
    }

    // Sequelize создаёт отдельные enum-типы — убираем их, иначе повторный up упадёт.
    const enumTypes = [
      'enum_inventory_items_kind',
      'enum_inventory_units_status',
      'enum_inventory_units_condition',
      'enum_inventory_movements_kind',
      'enum_inventory_issues_type',
      'enum_inventory_issues_status',
    ];
    for (const type of enumTypes) {
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "${type}" CASCADE;`
      );
    }
  },
};
