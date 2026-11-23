#!/usr/bin/env node
/**
 * Полная очистка данных: удаляет всех пользователей (кроме platform_admin)
 * и все тенанты (кроме "default") вместе со всеми дочерними записями.
 *
 * Запуск из каталога backend/:
 *   node src/scripts/reset-tenants.js --dry-run   # только посчитать
 *   node src/scripts/reset-tenants.js --yes       # удалить
 *
 * На проде (NODE_ENV=production) дополнительно нужен ALLOW_DANGEROUS_SCRIPTS=1.
 *
 * Что НЕ трогается:
 *   - структура таблиц (никаких DROP TABLE),
 *   - журнал миграций "SequelizeMeta",
 *   - пользователи с ролью platform_admin,
 *   - тенант со slug "default" (плюс любой тенант, к которому привязан
 *     platform_admin, если такой найдётся).
 *
 * Всё выполняется в одной транзакции: либо удаляется всё, либо ничего.
 */

require('dotenv').config();

const { QueryTypes } = require('sequelize');

// 🔥 Защита от случайного запуска в prod — как у clear-courses-and-lessons.js
if (
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_DANGEROUS_SCRIPTS !== '1'
) {
  console.error(
    '\n❌ Отказ: NODE_ENV=production. Этот скрипт удаляет данные.\n' +
    'Если действительно нужно — запустите с ALLOW_DANGEROUS_SCRIPTS=1\n'
  );
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CONFIRMED = args.has('--yes');

if (!DRY_RUN && !CONFIRMED) {
  console.error(
    '\n❌ Для удаления нужен флаг --yes.\n' +
    '   Сначала проверьте, что будет затронуто: --dry-run\n'
  );
  process.exit(1);
}

const { sequelize } = require('../models');

const KEEP_TENANT_SLUG = 'default';

// Порядок важен: сначала дети, потом родители (иначе упадут внешние ключи).
const WIPE_ORDER = [
  'lesson_responses',
  'notifications',
  'push_subscriptions',
  'messages',
  'Attendances',
  'ChildGroups',
  'Lessons',
  'Groups',
  'Children',
  'Courses',
];

const ALL_TABLES = [...WIPE_ORDER, 'Users', 'tenants'];

const countRows = async (table, transaction) => {
  const rows = await sequelize.query(
    `SELECT count(*)::int AS n FROM "${table}"`,
    { type: QueryTypes.SELECT, transaction }
  );
  return rows[0].n;
};

const pad = (n) => String(n).padStart(7);

async function main() {
  await sequelize.authenticate();

  console.log('Подключение к БД: OK');
  console.log(`Режим: ${DRY_RUN ? 'DRY-RUN (ничего не меняется)' : 'УДАЛЕНИЕ'}`);
  console.log(`Оставляем: platform_admin + тенант "${KEEP_TENANT_SLUG}"`);
  console.log('');

  const transaction = await sequelize.transaction();

  try {
    // ---------- 1. Что есть сейчас ----------
    const before = {};
    for (const table of ALL_TABLES) {
      before[table] = await countRows(table, transaction);
    }

    const admins = await sequelize.query(
      `SELECT id, email, name FROM "Users" WHERE role = 'platform_admin' ORDER BY "createdAt"`,
      { type: QueryTypes.SELECT, transaction }
    );

    const roles = await sequelize.query(
      `SELECT role, count(*)::int AS n FROM "Users" GROUP BY role ORDER BY role`,
      { type: QueryTypes.SELECT, transaction }
    );

    const keptTenants = await sequelize.query(
      `SELECT id, slug, name FROM tenants WHERE slug = :slug`,
      { type: QueryTypes.SELECT, replacements: { slug: KEEP_TENANT_SLUG }, transaction }
    );

    console.log('Сейчас в базе:');
    for (const table of ALL_TABLES) {
      console.log(`  ${table.padEnd(20)} ${pad(before[table])}`);
    }
    console.log(`  ${'— по ролям —'.padEnd(20)} ${roles.map((r) => `${r.role}=${r.n}`).join(', ')}`);
    console.log('');

    console.log(`Останется platform_admin: ${admins.length}`);
    for (const a of admins) {
      console.log(`  - ${a.email} (${a.name})`);
    }
    console.log(
      `Тенант "${KEEP_TENANT_SLUG}": ` +
      (keptTenants.length ? `найден id=${keptTenants[0].id}` : 'НЕ НАЙДЕН')
    );
    console.log('');

    if (DRY_RUN) {
      await transaction.rollback();
      console.log('[dry-run] Изменения не применялись.');
      return;
    }

    // ---------- 2. Предохранитель: без супер-админа не удаляем ----------
    if (admins.length === 0) {
      throw new Error(
        'В базе нет ни одного platform_admin — удаление отменено, ' +
        'чтобы не остаться без доступа к платформе.'
      );
    }

    // ---------- 3. Удаление ----------
    const deleted = {};

    for (const table of WIPE_ORDER) {
      const [, meta] = await sequelize.query(`DELETE FROM "${table}"`, { transaction });
      deleted[table] = meta.rowCount;
    }

    const [, usersMeta] = await sequelize.query(
      `DELETE FROM "Users" WHERE role <> 'platform_admin'`,
      { transaction }
    );
    deleted.Users = usersMeta.rowCount;

    // Тенанты, которые нельзя удалить: default + те, на которые ссылается
    // оставшийся platform_admin (по схеме у него tenantId обычно NULL, но
    // CHECK это разрешает, поэтому подстрахуемся).
    const keepTenantIds = keptTenants.map((t) => t.id);
    const adminTenantIds = await sequelize.query(
      `SELECT DISTINCT "tenantId" AS id FROM "Users"
        WHERE role = 'platform_admin' AND "tenantId" IS NOT NULL`,
      { type: QueryTypes.SELECT, transaction }
    );
    for (const row of adminTenantIds) {
      if (!keepTenantIds.includes(row.id)) keepTenantIds.push(row.id);
    }

    let deletedTenants;
    if (keepTenantIds.length === 0) {
      const [, meta] = await sequelize.query(`DELETE FROM tenants`, { transaction });
      deletedTenants = meta.rowCount;
    } else {
      const placeholders = keepTenantIds.map((_, i) => `:k${i}`);
      const replacements = {};
      keepTenantIds.forEach((id, i) => { replacements[`k${i}`] = id; });

      const [, meta] = await sequelize.query(
        `DELETE FROM tenants WHERE id NOT IN (${placeholders.join(', ')})`,
        { replacements, transaction }
      );
      deletedTenants = meta.rowCount;
    }
    deleted.tenants = deletedTenants;

    // ---------- 4. Проверка до COMMIT ----------
    const after = {};
    for (const table of ALL_TABLES) {
      after[table] = await countRows(table, transaction);
    }

    const problems = [];
    for (const table of WIPE_ORDER) {
      if (after[table] !== 0) problems.push(`${table}: осталось ${after[table]}`);
    }
    if (after.Users !== admins.length) {
      problems.push(`Users: осталось ${after.Users}, ожидалось ${admins.length}`);
    }
    if (after.tenants !== keepTenantIds.length) {
      problems.push(`tenants: осталось ${after.tenants}, ожидалось ${keepTenantIds.length}`);
    }

    if (problems.length > 0) {
      throw new Error('Проверка не сошлась, откатываю транзакцию:\n  ' + problems.join('\n  '));
    }

    await transaction.commit();

    // ---------- 5. Итог ----------
    console.log('Готово. Удалено строк:');
    for (const table of ALL_TABLES) {
      console.log(`  ${table.padEnd(20)} ${pad(deleted[table] || 0)}`);
    }
    console.log('');
    console.log(`Осталось: platform_admin=${after.Users}, tenants=${after.tenants}`);
    console.log('Не забудьте проверить вход в админку супер-админом.');
  } catch (err) {
    await transaction.rollback().catch(() => {});
    console.error('\n❌ Ошибка, транзакция откачена, данные НЕ изменены:');
    console.error('   ' + err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
