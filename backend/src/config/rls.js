const { getCurrentTenantId } = require('../utils/tenantContext');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Фаза 3.5, вариант A — RLS только для транзакционных операций.
 *
 * ПОЧЕМУ НЕ ХУКИ beforeQuery/afterQuery:
 *   - вызов `sequelize.query()` внутри `beforeQuery` рекурсивно триггерит
 *     тот же хук → бесконечная рекурсия либо исчерпание пула соединений
 *     (проверено в проде: SequelizeConnectionAcquireTimeoutError за 30s);
 *   - `set_config('app.tenant_id', :tid, false)` на уровне сессии "залипает"
 *     на соединении из пула → следующий запрос другого тенанта видит чужие
 *     данные (утечка между арендаторами).
 *
 * КАК РАБОТАЕТ:
 *   - Оборачиваем `sequelize.transaction()`.
 *   - Внутри КАЖДОЙ транзакции сразу выполняем
 *     `SELECT set_config('app.tenant_id', :tid, true)` — is_local=true.
 *   - `SET LOCAL` сбрасывается при COMMIT/ROLLBACK → утечки нет.
 *   - Если `tenantId` нет в ALS (cron-джобы, platform_admin без
 *     имперсонации) — транзакция идёт без SET LOCAL → RLS permissive.
 *
 * КОМПРОМИСС (осознанный):
 *   - Запросы БЕЗ транзакции (`Model.findAll()` / `Model.create()` без
 *     `sequelize.transaction`) идут под permissive-политикой RLS —
 *     `app.tenant_id` не установлен, RLS видит всё.
 *   - Изоляция для них обеспечивается явными `where: { tenantId }` в
 *     контроллерах (Фаза 3, подтверждено тестами: 404 на чужой, 400 на
 *     чужой teacherId).
 *   - Cron-джобы работают вне ALS → permissive → но у них в where уже
 *     есть `tenant_id`, поэтому возвращают корректные данные.
 *
 * ЧТО ЭТО ДАЁТ:
 *   - Операции внутри `sequelize.transaction(...)` получают RLS-защиту
 *     "в глубину": даже если в коде забудут `where: { tenantId }`, БД не
 *     отдаст/не вставит чужие строки.
 *   - Приложение больше не вешает пул (нет рекурсии, нет утечки сессии).
 *   - Cron-джобы и platform_admin продолжают работать.
 */
function setupRls(sequelize) {
  const originalTransaction = sequelize.transaction.bind(sequelize);

  /**
   * Обёртка над sequelize.transaction().
   * Поддерживает обе сигнатуры:
   *   sequelize.transaction(async (t) => { ... })          // managed
   *   sequelize.transaction(options, async (t) => { ... }) // managed + options
   *   sequelize.transaction()                              // unmanaged
   *   sequelize.transaction(options)                       // unmanaged + options
   */
  sequelize.transaction = function patchedTransaction(options, autoCallback) {
    // Нормализуем аргументы: (autoCallback) → (options={}, autoCallback)
    if (typeof options === 'function') {
      autoCallback = options;
      options = {};
    }
    options = options || {};

    const tenantId = getCurrentTenantId();
    const hasTenant = tenantId && UUID_RE.test(tenantId);

    // Нет тенанта в контексте — транзакция без SET LOCAL, permissive.
    if (!hasTenant) {
      return autoCallback
        ? originalTransaction(options, autoCallback)
        : originalTransaction(options);
    }

    // ----- Managed transaction (с callback) -----
    if (autoCallback) {
      return originalTransaction(options, async (t) => {
        // SET LOCAL app.tenant_id — is_local=true, сбросится при COMMIT/ROLLBACK
        await sequelize.query(
          `SELECT set_config('app.tenant_id', :tid, true)`,
          { replacements: { tid: tenantId }, transaction: t }
        );
        return autoCallback(t);
      });
    }

    // ----- Unmanaged transaction (без callback) -----
    // Возвращаем объект t, но с уже установленным SET LOCAL.
    // Пользователь сам вызывает t.commit() / t.rollback().
    return (async () => {
      const t = await originalTransaction(options);
      try {
        await sequelize.query(
          `SELECT set_config('app.tenant_id', :tid, true)`,
          { replacements: { tid: tenantId }, transaction: t }
        );
      } catch (err) {
        try {
          await t.rollback();
        } catch (_) {
          /* rollback может упасть, если транзакция уже закрыта — игнорируем */
        }
        throw err;
      }
      return t;
    })();
  };

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(
      '[rls] Transaction wrapper installed (variant A: RLS in transactions only)'
    );
  }
}

module.exports = setupRls;