const { Op } = require('sequelize');
const {
  FinanceCategory,
  FinanceTransaction,
  FinanceCharge,
  FinancePayment,
  Branch,
  Child,
  Group,
  Course,
  User,
} = require('../models');
const { requireTenant } = require('../utils/helpers');
const { getTenantTimezone, getZonedNow } = require('../utils/timezone');
const { getOrCreateCategory, monthBounds, MONTH_RE } = require('../services/financeService');
const { computeSalaryReport } = require('../services/salaryService');

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const dateOnly = (value) => String(value || '').slice(0, 10);

const METHOD_LABELS = {
  cash: 'наличные',
  card: 'карта',
  transfer: 'перевод',
  other: 'другое',
};

async function currentMonth(tenantId) {
  const timezone = await getTenantTimezone(tenantId);
  return getZonedNow(timezone).date.slice(0, 7);
}

async function resolveRange(tenantId, query) {
  const from = query.from ? dateOnly(query.from) : null;
  const to = query.to ? dateOnly(query.to) : null;
  if (from && to) return { from, to };

  const month = await currentMonth(tenantId);
  const bounds = monthBounds(month);
  return { from: bounds.from, to: bounds.to };
}

const transactionInclude = [
  { model: FinanceCategory, as: 'category', attributes: ['id', 'name', 'type'] },
  { model: Branch, as: 'branch', attributes: ['id', 'name'] },
  { model: User, as: 'author', attributes: ['id', 'name'] },
];

// =================== Категории ===================

exports.getCategories = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const categories = await FinanceCategory.findAll({
      where: { tenantId: tid },
      order: [['type', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']],
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const type = req.body?.type === 'expense' ? 'expense' : 'income';
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Укажите название категории' });

    const existing = await FinanceCategory.findOne({
      where: { tenantId: tid, type, name: { [Op.iLike]: name } },
    });
    if (existing) {
      return res.status(409).json({ message: 'Категория с таким названием уже есть' });
    }

    const category = await FinanceCategory.create({
      tenantId: tid,
      type,
      name,
      sortOrder: toNumber(req.body?.sortOrder, 0),
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const category = await FinanceCategory.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!category) return res.status(404).json({ message: 'Категория не найдена' });

    const { name, sortOrder, isActive } = req.body || {};
    if (name !== undefined) {
      const nextName = String(name || '').trim();
      if (!nextName) return res.status(400).json({ message: 'Укажите название категории' });
      const conflict = await FinanceCategory.findOne({
        where: {
          tenantId: tid,
          type: category.type,
          name: { [Op.iLike]: nextName },
          id: { [Op.ne]: category.id },
        },
      });
      if (conflict) {
        return res.status(409).json({ message: 'Категория с таким названием уже есть' });
      }
      category.name = nextName;
    }
    if (sortOrder !== undefined) category.sortOrder = toNumber(sortOrder, 0);
    if (isActive !== undefined) category.isActive = Boolean(isActive);
    await category.save();
    res.json(category);
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const category = await FinanceCategory.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!category) return res.status(404).json({ message: 'Категория не найдена' });

    const used = await FinanceTransaction.count({
      where: { tenantId: tid, categoryId: category.id },
    });
    if (used > 0) {
      return res.status(409).json({
        message: `Категория используется в ${used} операциях — удалить нельзя`,
      });
    }

    await category.destroy();
    res.json({ success: true, id: category.id });
  } catch (error) {
    next(error);
  }
};

// =================== Операции ===================

exports.getTransactions = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { branchId, type, categoryId, search, limit = 300 } = req.query;
    const { from, to } = await resolveRange(tid, req.query);

    const where = { tenantId: tid, occurredAt: { [Op.between]: [from, to] } };
    if (branchId) where.branchId = branchId;
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.comment = { [Op.iLike]: `%${String(search).trim()}%` };

    const transactions = await FinanceTransaction.findAll({
      where,
      include: transactionInclude,
      order: [['occurredAt', 'DESC'], ['createdAt', 'DESC']],
      limit: Math.min(toNumber(limit, 300), 1000),
    });

    res.json(transactions.map((tx) => ({ ...tx.toJSON(), amount: toMoney(tx.amount) })));
  } catch (error) {
    next(error);
  }
};

async function validateTransactionBody(tid, body) {
  const type = body.type === 'expense' ? 'expense' : 'income';
  const amount = toMoney(body.amount);
  const occurredAt = dateOnly(body.occurredAt);

  if (!occurredAt) return { error: 'Укажите дату операции' };
  if (amount <= 0) return { error: 'Сумма должна быть больше нуля' };

  let branchId = body.branchId || null;
  if (branchId) {
    const branch = await Branch.findOne({ where: { id: branchId, tenantId: tid } });
    if (!branch) return { error: 'Филиал не найден' };
  } else {
    branchId = null;
  }

  let categoryId = body.categoryId || null;
  if (categoryId) {
    const category = await FinanceCategory.findOne({
      where: { id: categoryId, tenantId: tid, type },
    });
    if (!category) return { error: 'Категория не найдена или не соответствует типу' };
  }

  const method = ['cash', 'card', 'transfer', 'other'].includes(body.method)
    ? body.method
    : 'other';

  return {
    type,
    amount,
    occurredAt,
    branchId,
    categoryId,
    method,
    comment: body.comment ? String(body.comment).trim() : null,
  };
}

exports.createTransaction = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const parsed = await validateTransactionBody(tid, req.body || {});
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const transaction = await FinanceTransaction.create({
      tenantId: tid,
      ...parsed,
      source: 'manual',
      period: parsed.occurredAt.slice(0, 7),
      createdBy: req.user.id,
    });

    const created = await FinanceTransaction.findByPk(transaction.id, {
      include: transactionInclude,
    });
    res.status(201).json({ ...created.toJSON(), amount: toMoney(created.amount) });
  } catch (error) {
    next(error);
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const transaction = await FinanceTransaction.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!transaction) return res.status(404).json({ message: 'Операция не найдена' });

    const parsed = await validateTransactionBody(tid, {
      ...transaction.toJSON(),
      ...req.body,
    });
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    await transaction.update({
      ...parsed,
      period: parsed.occurredAt.slice(0, 7),
    });

    const updated = await FinanceTransaction.findByPk(transaction.id, {
      include: transactionInclude,
    });
    res.json({ ...updated.toJSON(), amount: toMoney(updated.amount) });
  } catch (error) {
    next(error);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const transaction = await FinanceTransaction.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!transaction) return res.status(404).json({ message: 'Операция не найдена' });

    if (transaction.source === 'payment') {
      return res.status(409).json({
        message: 'Это доход от оплаты. Удалите саму оплату в разделе «Оплаты родителей».',
      });
    }

    await transaction.destroy();
    res.json({ success: true, id: transaction.id });
  } catch (error) {
    next(error);
  }
};

// =================== Сводка и аналитика ===================

exports.getSummary = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { branchId } = req.query;
    const { from, to } = await resolveRange(tid, req.query);

    const where = { tenantId: tid, occurredAt: { [Op.between]: [from, to] } };
    if (branchId) where.branchId = branchId;

    const transactions = await FinanceTransaction.findAll({
      where,
      include: [
        { model: FinanceCategory, as: 'category', attributes: ['id', 'name', 'type'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
      ],
      order: [['occurredAt', 'ASC']],
    });

    const branches = await Branch.findAll({
      where: { tenantId: tid },
      attributes: ['id', 'name'],
    });
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

    let income = 0;
    let expense = 0;
    const monthly = new Map();
    const byCategory = { income: new Map(), expense: new Map() };
    const byBranch = new Map();

    for (const tx of transactions) {
      const amount = toMoney(tx.amount);
      const month = String(tx.occurredAt).slice(0, 7);

      if (tx.type === 'income') income += amount;
      else expense += amount;

      if (!monthly.has(month)) {
        monthly.set(month, { month, income: 0, expense: 0 });
      }
      const monthRow = monthly.get(month);
      if (tx.type === 'income') monthRow.income += amount;
      else monthRow.expense += amount;

      const categoryKey = tx.categoryId || 'none';
      const categoryMap = byCategory[tx.type];
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          categoryId: tx.categoryId,
          name: tx.category ? tx.category.name : 'Без категории',
          amount: 0,
        });
      }
      categoryMap.get(categoryKey).amount += amount;

      const branchKey = tx.branchId || 'none';
      if (!byBranch.has(branchKey)) {
        byBranch.set(branchKey, {
          branchId: tx.branchId,
          branchName: tx.branchId
            ? branchNames.get(tx.branchId) || 'Филиал'
            : 'Без филиала',
          income: 0,
          expense: 0,
        });
      }
      const branchRow = byBranch.get(branchKey);
      if (tx.type === 'income') branchRow.income += amount;
      else branchRow.expense += amount;
    }

    const sortDesc = (a, b) => b.amount - a.amount;

    res.json({
      period: { from, to },
      totals: {
        income: toMoney(income),
        expense: toMoney(expense),
        profit: toMoney(income - expense),
        operations: transactions.length,
      },
      monthly: Array.from(monthly.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((row) => ({
          ...row,
          income: toMoney(row.income),
          expense: toMoney(row.expense),
          profit: toMoney(row.income - row.expense),
        })),
      byCategory: {
        income: Array.from(byCategory.income.values()).sort(sortDesc),
        expense: Array.from(byCategory.expense.values()).sort(sortDesc),
      },
      byBranch: Array.from(byBranch.values())
        .map((row) => ({
          ...row,
          income: toMoney(row.income),
          expense: toMoney(row.expense),
          profit: toMoney(row.income - row.expense),
        }))
        .sort((a, b) => b.profit - a.profit),
    });
  } catch (error) {
    next(error);
  }
};

// =================== Начисления и оплаты родителей ===================

exports.getDebts = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const period = MONTH_RE.test(String(req.query.period || ''))
      ? String(req.query.period)
      : await currentMonth(tid);
    const bounds = monthBounds(period);
    const { branchId } = req.query;

    const chargeWhere = { tenantId: tid, period };
    if (branchId) chargeWhere.branchId = branchId;

    const charges = await FinanceCharge.findAll({
      where: chargeWhere,
      include: [
        { model: Child, as: 'child', attributes: ['id', 'name', 'surname'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
      ],
    });

    const paymentWhere = {
      tenantId: tid,
      occurredAt: { [Op.between]: [bounds.from, bounds.to] },
    };
    if (branchId) paymentWhere.branchId = branchId;

    const payments = await FinancePayment.findAll({
      where: paymentWhere,
      include: [{ model: Child, as: 'child', attributes: ['id', 'name', 'surname'] }],
    });

    const map = new Map();

    const ensureRow = (childId, childName, branchName) => {
      if (!map.has(childId)) {
        map.set(childId, {
          childId,
          childName: childName || 'Ребёнок',
          branchName: branchName || null,
          charged: 0,
          paid: 0,
        });
      }
      return map.get(childId);
    };

    for (const charge of charges) {
      const childName = charge.child
        ? [charge.child.surname, charge.child.name].filter(Boolean).join(' ')
        : 'Ребёнок';
      const row = ensureRow(charge.childId, childName, charge.branch?.name);
      row.charged += toMoney(charge.amount);
    }

    for (const payment of payments) {
      const childName = payment.child
        ? [payment.child.surname, payment.child.name].filter(Boolean).join(' ')
        : 'Ребёнок';
      const row = map.get(payment.childId);
      if (row) row.paid += toMoney(payment.amount);
      else {
        map.set(payment.childId, {
          childId: payment.childId,
          childName,
          branchName: null,
          charged: 0,
          paid: toMoney(payment.amount),
        });
      }
    }

    const items = Array.from(map.values()).map((row) => ({
      ...row,
      charged: toMoney(row.charged),
      paid: toMoney(row.paid),
      debt: toMoney(row.charged - row.paid),
    }));

    res.json({
      period,
      from: bounds.from,
      to: bounds.to,
      totals: {
        charged: toMoney(items.reduce((sum, row) => sum + row.charged, 0)),
        paid: toMoney(items.reduce((sum, row) => sum + row.paid, 0)),
        debt: toMoney(items.reduce((sum, row) => sum + row.debt, 0)),
      },
      items: items.sort((a, b) => b.debt - a.debt || a.childName.localeCompare(b.childName)),
    });
  } catch (error) {
    next(error);
  }
};

exports.generateCharges = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const period = String(req.body?.period || '');
    if (!MONTH_RE.test(period)) {
      return res.status(400).json({ message: 'Укажите месяц в формате ГГГГ-ММ' });
    }
    const bounds = monthBounds(period);
    const { branchId } = req.body || {};

    const groupWhere = { tenantId: tid };
    if (branchId) groupWhere.branchId = branchId;

    const groups = await Group.findAll({
      where: groupWhere,
      include: [
        { model: Course, as: 'course' },
        { model: Child, as: 'children', through: { attributes: [] }, attributes: ['id'] },
      ],
    });

    let created = 0;
    let skipped = 0;
    let total = 0;

    for (const group of groups) {
      const price = group.course ? toMoney(group.course.price) : 0;
      if (price <= 0) continue;

      for (const child of group.children || []) {
        const [charge, isCreated] = await FinanceCharge.findOrCreate({
          where: { childId: child.id, groupId: group.id, period },
          defaults: {
            tenantId: tid,
            branchId: group.branchId || null,
            childId: child.id,
            groupId: group.id,
            period,
            amount: price,
            comment: null,
            createdBy: req.user.id,
          },
        });

        if (isCreated) {
          created += 1;
          total += price;
        } else {
          skipped += 1;
        }
      }
    }

    res.json({
      success: true,
      period,
      from: bounds.from,
      to: bounds.to,
      created,
      skipped,
      total: toMoney(total),
      message: `Начислено ${created} (пропущено ${skipped}), сумма ${toMoney(total)} ₽`,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { branchId, childId, limit = 200 } = req.query;
    const { from, to } = await resolveRange(tid, req.query);

    const where = { tenantId: tid, occurredAt: { [Op.between]: [from, to] } };
    if (branchId) where.branchId = branchId;
    if (childId) where.childId = childId;

    const payments = await FinancePayment.findAll({
      where,
      include: [
        { model: Child, as: 'child', attributes: ['id', 'name', 'surname'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: FinanceCharge, as: 'charge', attributes: ['id', 'period', 'amount'] },
      ],
      order: [['occurredAt', 'DESC']],
      limit: Math.min(toNumber(limit, 200), 500),
    });

    res.json(
      payments.map((payment) => ({ ...payment.toJSON(), amount: toMoney(payment.amount) }))
    );
  } catch (error) {
    next(error);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { childId, amount, occurredAt, method, comment, chargeId } = req.body || {};

    const paymentAmount = toMoney(amount);
    const date = dateOnly(occurredAt);
    if (!childId) return res.status(400).json({ message: 'Выберите ребёнка' });
    if (paymentAmount <= 0) {
      return res.status(400).json({ message: 'Сумма должна быть больше нуля' });
    }
    if (!date) return res.status(400).json({ message: 'Укажите дату оплаты' });

    const child = await Child.findOne({
      where: { id: childId, tenantId: tid },
      include: [
        {
          model: Group,
          as: 'groups',
          through: { attributes: [] },
          attributes: ['id', 'branchId'],
        },
      ],
    });
    if (!child) return res.status(404).json({ message: 'Ребёнок не найден' });

    const branchId = child.groups && child.groups.length ? child.groups[0].branchId : null;
    const childName = [child.surname, child.name].filter(Boolean).join(' ') || child.name;

    const payment = await FinancePayment.create({
      tenantId: tid,
      branchId,
      childId: child.id,
      chargeId: chargeId || null,
      amount: paymentAmount,
      occurredAt: date,
      method: ['cash', 'card', 'transfer', 'other'].includes(method) ? method : 'other',
      comment: comment ? String(comment).trim() : null,
      createdBy: req.user.id,
    });

    const category = await getOrCreateCategory(tid, 'income', 'Оплата занятий');
    const transaction = await FinanceTransaction.create({
      tenantId: tid,
      branchId,
      type: 'income',
      categoryId: category.id,
      amount: paymentAmount,
      occurredAt: date,
      method: payment.method,
      comment: `Оплата: ${childName}`,
      source: 'payment',
      sourceId: payment.id,
      period: date.slice(0, 7),
      createdBy: req.user.id,
    });

    await payment.update({ transactionId: transaction.id });

    res.status(201).json({
      payment,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const payment = await FinancePayment.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!payment) return res.status(404).json({ message: 'Оплата не найдена' });

    if (payment.transactionId) {
      await FinanceTransaction.destroy({
        where: { id: payment.transactionId, tenantId: tid },
      });
    }
    await payment.destroy();
    res.json({ success: true, id: payment.id });
  } catch (error) {
    next(error);
  }
};

// =================== Зарплата ===================

exports.generateSalary = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const period = String(req.body?.period || '');
    if (!MONTH_RE.test(period)) {
      return res.status(400).json({ message: 'Укажите месяц в формате ГГГГ-ММ' });
    }
    const bounds = monthBounds(period);
    const report = await computeSalaryReport(tid, bounds.from, bounds.to);

    const category = await getOrCreateCategory(tid, 'expense', 'Зарплата');
    let created = 0;
    let skipped = 0;
    let total = 0;

    for (const teacher of report.teachers) {
      const amount = toMoney(teacher.salary);
      if (amount <= 0) continue;

      const existing = await FinanceTransaction.findOne({
        where: {
          tenantId: tid,
          source: 'salary',
          sourceId: teacher.teacherId,
          period,
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      await FinanceTransaction.create({
        tenantId: tid,
        branchId: null,
        type: 'expense',
        categoryId: category.id,
        amount,
        occurredAt: bounds.to,
        method: 'other',
        comment: `Зарплата: ${teacher.teacherName} за ${period}`,
        source: 'salary',
        sourceId: teacher.teacherId,
        period,
        createdBy: req.user.id,
      });
      created += 1;
      total += amount;
    }

    res.json({
      success: true,
      period,
      created,
      skipped,
      total: toMoney(total),
      message: `Начислено зарплат: ${created} (пропущено ${skipped}), сумма ${toMoney(total)} ₽`,
    });
  } catch (error) {
    next(error);
  }
};
