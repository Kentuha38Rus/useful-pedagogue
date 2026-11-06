require('dotenv').config();
const { sequelize, Child, Group, ChildGroup } = require('../src/models');

(async () => {
  const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
  const t = await sequelize.transaction();
  try {
    const child = await Child.create(
      { tenantId: DEFAULT_TENANT, name: 'hook-test-child' },
      { transaction: t }
    );
    const group = await Group.create(
      { tenantId: DEFAULT_TENANT, name: 'hook-test-group' },
      { transaction: t }
    );

    // 1) Single create path → beforeValidate
    await child.addGroup(group, { transaction: t });
    const cg1 = await ChildGroup.findOne({
      where: { childId: child.id, groupId: group.id },
      transaction: t,
    });
    console.log('addGroup → tenantId =', cg1 && cg1.tenantId);

    // 2) Bulk path → beforeBulkCreate
    await ChildGroup.destroy({ where: {}, transaction: t });
    await child.setGroups([group], { transaction: t });
    const cg2 = await ChildGroup.findOne({
      where: { childId: child.id, groupId: group.id },
      transaction: t,
    });
    console.log('setGroups → tenantId =', cg2 && cg2.tenantId);

    const ok =
      cg1 && cg1.tenantId === DEFAULT_TENANT &&
      cg2 && cg2.tenantId === DEFAULT_TENANT;
    console.log(ok ? '✅ ХУКИ РАБОТАЮТ' : '❌ ХУКИ НЕ РАБОТАЮТ');

    await t.rollback(); // откатываем — БД остаётся чистой
  } catch (e) {
    console.error('❌ ERROR:', e.message);
    await t.rollback();
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
