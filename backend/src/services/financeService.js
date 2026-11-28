const { Op } = require('sequelize');
const { FinanceCategory, FinanceTransaction } = require('../models');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Категория по названию: находит или создаёт.
 * Нужна для автоопераций (оплата занятий, зарплата, закупки).
 */
async function getOrCreateCategory(tenantId, type, name) {
  const existing = await FinanceCategory.findOne({
    where: { tenantId, type, name: { [Op.iLike]: name } },
  });
  if (existing) return existing;
  return FinanceCategory.create({ tenantId, type, name, isActive: true });
}

/** Границы месяца 'YYYY-MM' → { from: 'YYYY-MM-01', to: 'YYYY-MM-31' }. */
function monthBounds(period) {
  const value = MONTH_RE.test(String(period)) ? String(period) : null;
  if (!value) return null;
  const [year, month] = value.split('-').map(Number);
  const from = `${value}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${value}-${String(lastDay).padStart(2, '0')}`;
  return { period: value, from, to };
}

module.exports = { MONTH_RE, getOrCreateCategory, monthBounds };

/**
 * Расход на закупку из модуля имущества.
 * Вызывается при приходе оборудования/расходников, если отмечено «учесть как расход».
 */
async function createInventoryExpense({
  tenantId,
  branchId,
  amount,
  occurredAt,
  comment,
  sourceId,
  createdBy,
}) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;

  const date = occurredAt
    ? String(occurredAt).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const category = await getOrCreateCategory(tenantId, 'expense', 'Закупки');

  return FinanceTransaction.create({
    tenantId,
    branchId: branchId || null,
    type: 'expense',
    categoryId: category.id,
    amount: Math.round(value * 100) / 100,
    occurredAt: date,
    method: 'other',
    comment: comment || null,
    source: 'inventory',
    sourceId: sourceId || null,
    period: date.slice(0, 7),
    createdBy: createdBy || null,
  });
}

module.exports.createInventoryExpense = createInventoryExpense;
