const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const {
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
  InventoryBalance,
  InventoryMovement,
  InventoryIssue,
  Branch,
  Group,
  User,
} = require('../models');
const { requireTenant } = require('../utils/helpers');

// ---------- Вспомогательные ----------
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const parseIdList = (value) => {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const branchFilter = (branchId) => (branchId ? { branchId } : {});

async function ensureBranch(tenantId, branchId) {
  if (!branchId) return null;
  return Branch.findOne({ where: { id: branchId, tenantId } });
}

async function ensureItem(tenantId, itemId) {
  if (!itemId) return null;
  return InventoryItem.findOne({ where: { id: itemId, tenantId } });
}

async function nextInventoryNumber(tenantId) {
  const base = (await InventoryUnit.count({ where: { tenantId } })) + 1;
  for (let i = 0; i < 100; i += 1) {
    const candidate = `ИНВ-${String(base + i).padStart(6, '0')}`;
    const exists = await InventoryUnit.findOne({
      where: { tenantId, inventoryNumber: candidate },
      attributes: ['id'],
    });
    if (!exists) return candidate;
  }
  return `ИНВ-${Date.now()}`;
}

// Филиалы, доступные педагогу: через его группы. Админ видит все.
async function getTeacherBranchIds(tenantId, userId) {
  const rows = await Group.findAll({
    where: { tenantId, teacherId: userId },
    attributes: ['branchId'],
    group: ['branchId'],
    raw: true,
  });
  return rows.map((row) => row.branchId).filter(Boolean);
}

async function resolveAllowedBranchIds(req, tenantId) {
  const role = req.effectiveRole || req.user.role;
  if (role === 'admin' || role === 'platform_admin') return null;
  return getTeacherBranchIds(tenantId, req.user.id);
}

function scopeByBranches(where, allowedBranchIds) {
  if (allowedBranchIds === null) return where;
  where.branchId = { [Op.in]: allowedBranchIds };
  return where;
}

const unitInclude = [
  {
    model: InventoryItem,
    as: 'item',
    attributes: ['id', 'name', 'kind', 'unit', 'price'],
    include: [{ model: InventoryCategory, as: 'category', attributes: ['id', 'name'] }],
  },
  { model: Branch, as: 'branch', attributes: ['id', 'name'] },
  { model: User, as: 'responsible', attributes: ['id', 'name'] },
];

const balanceInclude = [
  {
    model: InventoryItem,
    as: 'item',
    attributes: ['id', 'name', 'unit', 'price', 'minQuantity', 'kind'],
    include: [{ model: InventoryCategory, as: 'category', attributes: ['id', 'name'] }],
  },
  { model: Branch, as: 'branch', attributes: ['id', 'name'] },
];

const movementInclude = [
  { model: InventoryItem, as: 'item', attributes: ['id', 'name', 'unit'] },
  { model: InventoryUnit, as: 'unit', attributes: ['id', 'inventoryNumber'] },
  { model: Branch, as: 'fromBranch', attributes: ['id', 'name'] },
  { model: Branch, as: 'toBranch', attributes: ['id', 'name'] },
  { model: User, as: 'author', attributes: ['id', 'name'] },
];

const issueInclude = [
  { model: Branch, as: 'branch', attributes: ['id', 'name'] },
  { model: InventoryItem, as: 'item', attributes: ['id', 'name', 'unit'] },
  { model: InventoryUnit, as: 'unit', attributes: ['id', 'inventoryNumber'] },
  { model: User, as: 'author', attributes: ['id', 'name'] },
  { model: User, as: 'resolver', attributes: ['id', 'name'] },
];

// =================== Справочники ===================

exports.getCategories = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const categories = await InventoryCategory.findAll({
      where: { tenantId: tid },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    const counts = await InventoryItem.findAll({
      where: { tenantId: tid },
      attributes: [
        'categoryId',
        [InventoryItem.sequelize.fn('COUNT', InventoryItem.sequelize.col('id')), 'cnt'],
      ],
      group: ['categoryId'],
      raw: true,
    });
    const countMap = new Map(counts.map((row) => [row.categoryId, Number(row.cnt)]));

    res.json(
      categories.map((category) => ({
        ...category.toJSON(),
        itemsCount: countMap.get(category.id) || 0,
      }))
    );
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Укажите название категории' });

    const existing = await InventoryCategory.findOne({
      where: { tenantId: tid, name: { [Op.iLike]: name } },
    });
    if (existing) {
      return res.status(409).json({ message: 'Категория с таким названием уже есть' });
    }

    const category = await InventoryCategory.create({
      tenantId: tid,
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
    const category = await InventoryCategory.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!category) return res.status(404).json({ message: 'Категория не найдена' });

    const { name, sortOrder, isActive } = req.body || {};
    if (name !== undefined) {
      const nextName = String(name || '').trim();
      if (!nextName) return res.status(400).json({ message: 'Укажите название категории' });
      const conflict = await InventoryCategory.findOne({
        where: {
          tenantId: tid,
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
    const category = await InventoryCategory.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!category) return res.status(404).json({ message: 'Категория не найдена' });

    const itemsCount = await InventoryItem.count({
      where: { tenantId: tid, categoryId: category.id },
    });
    if (itemsCount > 0) {
      return res.status(409).json({
        message: `В категории ${itemsCount} позиций. Сначала перенесите их в другую категорию.`,
      });
    }

    await category.destroy();
    res.json({ success: true, id: category.id });
  } catch (error) {
    next(error);
  }
};

// =================== Номенклатура ===================

exports.getItems = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { search, kind, categoryId } = req.query;
    const where = { tenantId: tid };
    if (kind) where.kind = kind;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.name = { [Op.iLike]: `%${String(search).trim()}%` };
    }

    const items = await InventoryItem.findAll({
      where,
      include: [{ model: InventoryCategory, as: 'category', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { name, categoryId, kind, unit, price, minQuantity, note } = req.body || {};
    const itemName = String(name || '').trim();
    if (!itemName) return res.status(400).json({ message: 'Укажите название позиции' });

    const itemKind = kind === 'bulk' ? 'bulk' : 'unit';
    if (categoryId) {
      const category = await InventoryCategory.findOne({
        where: { id: categoryId, tenantId: tid },
      });
      if (!category) return res.status(400).json({ message: 'Категория не найдена' });
    }

    const item = await InventoryItem.create({
      tenantId: tid,
      categoryId: categoryId || null,
      name: itemName,
      kind: itemKind,
      unit: unit ? String(unit).trim().slice(0, 20) : 'шт',
      price: price === '' || price === undefined ? null : toMoney(price),
      minQuantity: toNumber(minQuantity, 0),
      note: note ? String(note).trim() : null,
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!item) return res.status(404).json({ message: 'Позиция не найдена' });

    const { name, categoryId, kind, unit, price, minQuantity, note, isActive } = req.body || {};
    if (name !== undefined) {
      const nextName = String(name || '').trim();
      if (!nextName) return res.status(400).json({ message: 'Укажите название позиции' });
      item.name = nextName;
    }
    if (categoryId !== undefined) {
      if (categoryId) {
        const category = await InventoryCategory.findOne({
          where: { id: categoryId, tenantId: tid },
        });
        if (!category) return res.status(400).json({ message: 'Категория не найдена' });
      }
      item.categoryId = categoryId || null;
    }
    if (kind !== undefined) item.kind = kind === 'bulk' ? 'bulk' : 'unit';
    if (unit !== undefined) item.unit = String(unit || 'шт').trim().slice(0, 20);
    if (price !== undefined) item.price = price === '' || price === null ? null : toMoney(price);
    if (minQuantity !== undefined) item.minQuantity = toNumber(minQuantity, 0);
    if (note !== undefined) item.note = note ? String(note).trim() : null;
    if (isActive !== undefined) item.isActive = Boolean(isActive);

    await item.save();
    res.json(item);
  } catch (error) {
    next(error);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const item = await InventoryItem.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!item) return res.status(404).json({ message: 'Позиция не найдена' });

    const [unitsCount, balancesCount] = await Promise.all([
      InventoryUnit.count({ where: { tenantId: tid, itemId: item.id } }),
      InventoryBalance.count({ where: { tenantId: tid, itemId: item.id } }),
    ]);
    if (unitsCount > 0 || balancesCount > 0) {
      return res.status(409).json({
        message: 'По позиции уже есть экземпляры или остатки — удалить нельзя, можно списать.',
      });
    }

    await item.destroy();
    res.json({ success: true, id: item.id });
  } catch (error) {
    next(error);
  }
};

// =================== Экземпляры (поштучно) ===================

exports.getUnits = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const allowed = await resolveAllowedBranchIds(req, tid);
    const { branchId, itemId, status, search } = req.query;

    const where = { tenantId: tid };
    if (branchId) where.branchId = branchId;
    if (itemId) where.itemId = itemId;
    if (status) where.status = status;
    if (search) {
      const q = String(search).trim();
      where[Op.or] = [
        { inventoryNumber: { [Op.iLike]: `%${q}%` } },
        { serialNumber: { [Op.iLike]: `%${q}%` } },
        { location: { [Op.iLike]: `%${q}%` } },
      ];
    }
    scopeByBranches(where, allowed);

    const units = await InventoryUnit.findAll({
      where,
      include: unitInclude,
      order: [['createdAt', 'DESC']],
    });
    res.json(units);
  } catch (error) {
    next(error);
  }
};

exports.createUnit = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const {
      itemId,
      branchId,
      inventoryNumber,
      serialNumber,
      condition,
      location,
      responsibleUserId,
      purchaseDate,
      price,
      supplier,
      warrantyUntil,
      note,
    } = req.body || {};

    const item = await ensureItem(tid, itemId);
    if (!item) return res.status(400).json({ message: 'Позиция не найдена' });
    if (item.kind !== 'unit') {
      return res.status(400).json({ message: 'Это расходник — добавляйте его через приход по количеству' });
    }

    const branch = await ensureBranch(tid, branchId);
    if (branchId && !branch) return res.status(400).json({ message: 'Филиал не найден' });

    const number = inventoryNumber
      ? String(inventoryNumber).trim()
      : await nextInventoryNumber(tid);

    const existing = await InventoryUnit.findOne({
      where: { tenantId: tid, inventoryNumber: number },
    });
    if (existing) {
      return res.status(409).json({ message: `Инвентарный номер ${number} уже занят` });
    }

    const unit = await InventoryUnit.create({
      tenantId: tid,
      itemId: item.id,
      branchId: branch ? branch.id : null,
      inventoryNumber: number,
      serialNumber: serialNumber ? String(serialNumber).trim() : null,
      condition: ['new', 'good', 'wear', 'broken'].includes(condition) ? condition : 'good',
      location: location ? String(location).trim() : null,
      responsibleUserId: responsibleUserId || null,
      purchaseDate: purchaseDate || null,
      price:
        price === '' || price === undefined || price === null
          ? item.price
          : toMoney(price),
      supplier: supplier ? String(supplier).trim() : null,
      warrantyUntil: warrantyUntil || null,
      note: note ? String(note).trim() : null,
    });

    await InventoryMovement.create({
      tenantId: tid,
      kind: 'receipt',
      itemId: item.id,
      unitId: unit.id,
      quantity: 1,
      toBranchId: unit.branchId,
      price: unit.price,
      occurredAt: new Date(),
      createdBy: req.user.id,
      comment: 'Приход оборудования',
    });

    const created = await InventoryUnit.findByPk(unit.id, { include: unitInclude });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

exports.updateUnit = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const unit = await InventoryUnit.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!unit) return res.status(404).json({ message: 'Экземпляр не найден' });

    const {
      serialNumber,
      condition,
      location,
      responsibleUserId,
      purchaseDate,
      price,
      supplier,
      warrantyUntil,
      note,
    } = req.body || {};

    if (serialNumber !== undefined) {
      unit.serialNumber = serialNumber ? String(serialNumber).trim() : null;
    }
    if (condition !== undefined && ['new', 'good', 'wear', 'broken'].includes(condition)) {
      unit.condition = condition;
    }
    if (location !== undefined) unit.location = location ? String(location).trim() : null;
    if (responsibleUserId !== undefined) unit.responsibleUserId = responsibleUserId || null;
    if (purchaseDate !== undefined) unit.purchaseDate = purchaseDate || null;
    if (price !== undefined) unit.price = price === '' || price === null ? null : toMoney(price);
    if (supplier !== undefined) unit.supplier = supplier ? String(supplier).trim() : null;
    if (warrantyUntil !== undefined) unit.warrantyUntil = warrantyUntil || null;
    if (note !== undefined) unit.note = note ? String(note).trim() : null;

    await unit.save();
    const updated = await InventoryUnit.findByPk(unit.id, { include: unitInclude });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.transferUnit = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const unit = await InventoryUnit.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!unit) return res.status(404).json({ message: 'Экземпляр не найден' });

    const { branchId, comment, documentNumber } = req.body || {};
    const branch = await ensureBranch(tid, branchId);
    if (!branch) return res.status(400).json({ message: 'Филиал не найден' });
    if (unit.branchId === branch.id) {
      return res.status(400).json({ message: 'Экземпляр уже в этом филиале' });
    }
    if (unit.status !== 'in_use') {
      return res.status(400).json({ message: 'Перемещать можно только используемое имущество' });
    }

    const fromBranchId = unit.branchId;
    await unit.update({ branchId: branch.id });
    await InventoryMovement.create({
      tenantId: tid,
      kind: 'transfer',
      itemId: unit.itemId,
      unitId: unit.id,
      quantity: 1,
      fromBranchId,
      toBranchId: branch.id,
      documentNumber: documentNumber ? String(documentNumber).trim() : null,
      occurredAt: new Date(),
      comment: comment ? String(comment).trim() : null,
      createdBy: req.user.id,
    });

    const updated = await InventoryUnit.findByPk(unit.id, { include: unitInclude });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.writeOffUnit = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const unit = await InventoryUnit.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!unit) return res.status(404).json({ message: 'Экземпляр не найден' });
    if (unit.status === 'written_off') {
      return res.status(400).json({ message: 'Экземпляр уже списан' });
    }

    const { comment, documentNumber } = req.body || {};
    await unit.update({ status: 'written_off' });
    const movement = await InventoryMovement.create({
      tenantId: tid,
      kind: 'write_off',
      itemId: unit.itemId,
      unitId: unit.id,
      quantity: 1,
      fromBranchId: unit.branchId,
      price: unit.price,
      documentNumber: documentNumber ? String(documentNumber).trim() : null,
      occurredAt: new Date(),
      comment: comment ? String(comment).trim() : null,
      createdBy: req.user.id,
    });

    res.json({ unit: await InventoryUnit.findByPk(unit.id, { include: unitInclude }), movement });
  } catch (error) {
    next(error);
  }
};

exports.changeUnitStatus = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const unit = await InventoryUnit.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!unit) return res.status(404).json({ message: 'Экземпляр не найден' });

    const { status, comment } = req.body || {};
    if (!['in_use', 'repair', 'lost'].includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }
    if (unit.status === 'written_off') {
      return res.status(400).json({ message: 'Списанный экземпляр нельзя вернуть в работу' });
    }

    const kind = status === 'repair' ? 'repair' : status === 'in_use' ? 'return' : 'inventory_check';

    await unit.update({ status });
    await InventoryMovement.create({
      tenantId: tid,
      kind,
      itemId: unit.itemId,
      unitId: unit.id,
      quantity: 1,
      toBranchId: unit.branchId,
      occurredAt: new Date(),
      comment: comment ? String(comment).trim() : null,
      createdBy: req.user.id,
    });

    res.json(await InventoryUnit.findByPk(unit.id, { include: unitInclude }));
  } catch (error) {
    next(error);
  }
};

// =================== Расходники (по количеству) ===================

exports.getBalances = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const allowed = await resolveAllowedBranchIds(req, tid);
    const { branchId, search } = req.query;

    const where = { tenantId: tid };
    if (branchId) where.branchId = branchId;
    scopeByBranches(where, allowed);

    const include = balanceInclude.map((entry) => ({ ...entry }));
    if (search) {
      include[0] = {
        ...include[0],
        where: { name: { [Op.iLike]: `%${String(search).trim()}%` } },
        required: true,
      };
    }

    const balances = await InventoryBalance.findAll({
      where,
      include,
      order: [['updatedAt', 'DESC']],
    });

    res.json(
      balances.map((balance) => {
        const json = balance.toJSON();
        const quantity = toNumber(json.quantity);
        const minQuantity = toNumber(json.item?.minQuantity);
        return {
          ...json,
          quantity,
          isLowStock: minQuantity > 0 && quantity <= minQuantity,
        };
      })
    );
  } catch (error) {
    next(error);
  }
};

exports.receiptBalance = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { itemId, branchId, quantity, price, documentNumber, comment } = req.body || {};

    const item = await ensureItem(tid, itemId);
    if (!item) return res.status(400).json({ message: 'Позиция не найдена' });
    if (item.kind !== 'bulk') {
      return res.status(400).json({ message: 'Это оборудование — добавляйте его поштучно' });
    }
    const branch = await ensureBranch(tid, branchId);
    if (!branch) return res.status(400).json({ message: 'Филиал не найден' });

    const amount = toNumber(quantity);
    if (amount <= 0) return res.status(400).json({ message: 'Количество должно быть больше нуля' });

    const [balance] = await InventoryBalance.findOrCreate({
      where: { itemId: item.id, branchId: branch.id },
      defaults: { tenantId: tid, itemId: item.id, branchId: branch.id, quantity: 0 },
    });
    await balance.update({ quantity: toNumber(balance.quantity) + amount });

    if (price !== undefined && price !== null && price !== '') {
      await item.update({ price: toMoney(price) });
    }

    await InventoryMovement.create({
      tenantId: tid,
      kind: 'receipt',
      itemId: item.id,
      quantity: amount,
      toBranchId: branch.id,
      price: price === undefined || price === null || price === '' ? item.price : toMoney(price),
      documentNumber: documentNumber ? String(documentNumber).trim() : null,
      occurredAt: new Date(),
      comment: comment ? String(comment).trim() : null,
      createdBy: req.user.id,
    });

    res.status(201).json(await InventoryBalance.findByPk(balance.id, { include: balanceInclude }));
  } catch (error) {
    next(error);
  }
};

exports.writeOffBalance = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { itemId, branchId, quantity, documentNumber, comment } = req.body || {};

    const amount = toNumber(quantity);
    if (amount <= 0) return res.status(400).json({ message: 'Количество должно быть больше нуля' });

    const balance = await InventoryBalance.findOne({
      where: { tenantId: tid, itemId, branchId },
      include: balanceInclude,
    });
    if (!balance) return res.status(404).json({ message: 'Остаток не найден' });

    const current = toNumber(balance.quantity);
    if (amount > current) {
      return res.status(400).json({ message: `Нельзя списать больше, чем есть (${current})` });
    }

    await balance.update({ quantity: current - amount });

    await InventoryMovement.create({
      tenantId: tid,
      kind: 'write_off',
      itemId: balance.itemId,
      quantity: amount,
      fromBranchId: balance.branchId,
      price: balance.item ? balance.item.price : null,
      documentNumber: documentNumber ? String(documentNumber).trim() : null,
      occurredAt: new Date(),
      comment: comment ? String(comment).trim() : null,
      createdBy: req.user.id,
    });

    res.json(await InventoryBalance.findByPk(balance.id, { include: balanceInclude }));
  } catch (error) {
    next(error);
  }
};

// =================== Журнал операций ===================

exports.getMovements = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { branchId, itemId, kind, from, to, limit = 100 } = req.query;

    const where = { tenantId: tid };
    if (branchId) {
      where[Op.or] = [{ fromBranchId: branchId }, { toBranchId: branchId }];
    }
    if (itemId) where.itemId = itemId;
    if (kind) where.kind = kind;
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt[Op.gte] = new Date(`${from}T00:00:00`);
      if (to) where.occurredAt[Op.lte] = new Date(`${to}T23:59:59`);
    }

    const movements = await InventoryMovement.findAll({
      where,
      include: movementInclude,
      order: [['occurredAt', 'DESC']],
      limit: Math.min(toNumber(limit, 100), 500),
    });
    res.json(movements);
  } catch (error) {
    next(error);
  }
};

exports.getMovement = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const movement = await InventoryMovement.findOne({
      where: { id: req.params.id, tenantId: tid },
      include: movementInclude,
    });
    if (!movement) return res.status(404).json({ message: 'Операция не найдена' });
    res.json(movement);
  } catch (error) {
    next(error);
  }
};

// =================== Сводка ===================

exports.getSummary = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { branchId } = req.query;

    const unitWhere = { tenantId: tid, status: 'in_use', ...branchFilter(branchId) };
    const units = await InventoryUnit.findAll({
      where: unitWhere,
      attributes: ['id', 'price', 'status'],
    });
    const writtenOffCount = await InventoryUnit.count({
      where: { tenantId: tid, status: 'written_off', ...branchFilter(branchId) },
    });

    const balances = await InventoryBalance.findAll({
      where: { tenantId: tid, ...branchFilter(branchId) },
      include: [{ model: InventoryItem, as: 'item', attributes: ['price'] }],
    });

    const unitsValue = units.reduce((sum, unit) => sum + toMoney(unit.price), 0);
    const balancesValue = balances.reduce(
      (sum, balance) =>
        sum + toNumber(balance.quantity) * toMoney(balance.item?.price),
      0
    );

    const itemsCount = await InventoryItem.count({ where: { tenantId: tid } });
    const openIssues = await InventoryIssue.count({
      where: { tenantId: tid, status: { [Op.in]: ['new', 'in_progress'] }, ...branchFilter(branchId) },
    });

    res.json({
      unitsCount: units.length,
      unitsValue: toMoney(unitsValue),
      writtenOffCount,
      balancesValue: toMoney(balancesValue),
      lowStockCount: balances.filter(
        (balance) =>
          toNumber(balance.item?.minQuantity) > 0 &&
          toNumber(balance.quantity) <= toNumber(balance.item?.minQuantity)
      ).length,
      itemsCount,
      openIssues,
      totalValue: toMoney(unitsValue + balancesValue),
    });
  } catch (error) {
    next(error);
  }
};

// =================== Заявки ===================

exports.getIssues = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const allowed = await resolveAllowedBranchIds(req, tid);
    const { status, branchId } = req.query;
    const role = req.effectiveRole || req.user.role;

    const where = { tenantId: tid };
    if (status) where.status = status;
    if (role !== 'admin') {
      // Педагог видит свои заявки
      where.createdBy = req.user.id;
    }
    if (branchId) where.branchId = branchId;
    if (allowed !== null) {
      where[Op.and] = [
        { [Op.or]: [{ branchId: { [Op.in]: allowed } }, { branchId: null }] },
      ];
    }

    const issues = await InventoryIssue.findAll({
      where,
      include: issueInclude,
      order: [['createdAt', 'DESC']],
    });
    res.json(issues);
  } catch (error) {
    next(error);
  }
};

exports.createIssue = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { type, comment, itemId, unitId, branchId } = req.body || {};
    const text = String(comment || '').trim();
    if (!text) return res.status(400).json({ message: 'Опишите проблему' });

    const allowed = await resolveAllowedBranchIds(req, tid);

    let resolvedBranchId = branchId || null;
    let resolvedItemId = itemId || null;

    if (unitId) {
      const unit = await InventoryUnit.findOne({
        where: { id: unitId, tenantId: tid },
        attributes: ['id', 'itemId', 'branchId'],
      });
      if (!unit) return res.status(400).json({ message: 'Экземпляр не найден' });
      resolvedItemId = unit.itemId;
      resolvedBranchId = unit.branchId;
    } else if (itemId) {
      const item = await InventoryItem.findOne({
        where: { id: itemId, tenantId: tid },
        attributes: ['id'],
      });
      if (!item) return res.status(400).json({ message: 'Позиция не найдена' });
    }

    if (allowed !== null) {
      if (!resolvedBranchId && allowed.length === 1) {
        resolvedBranchId = allowed[0];
      }
      const allowedStrings = allowed.map((value) => String(value));
      if (!resolvedBranchId || !allowedStrings.includes(String(resolvedBranchId))) {
        return res.status(403).json({ message: 'Нет доступа к имуществу этого филиала' });
      }
    }

    const issue = await InventoryIssue.create({
      tenantId: tid,
      branchId: resolvedBranchId,
      itemId: resolvedItemId,
      unitId: unitId || null,
      type: ['breakdown', 'missing', 'need_purchase', 'other'].includes(type)
        ? type
        : 'breakdown',
      comment: text,
      status: 'new',
      createdBy: req.user.id,
    });

    const created = await InventoryIssue.findByPk(issue.id, { include: issueInclude });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

exports.updateIssue = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const issue = await InventoryIssue.findOne({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!issue) return res.status(404).json({ message: 'Заявка не найдена' });

    const { status, resolutionComment } = req.body || {};
    if (!['new', 'in_progress', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Недопустимый статус' });
    }

    const patch = { status };
    if (resolutionComment !== undefined) {
      patch.resolutionComment = resolutionComment ? String(resolutionComment).trim() : null;
    }
    if (status === 'resolved' || status === 'rejected') {
      patch.resolvedBy = req.user.id;
      patch.resolvedAt = new Date();
    } else {
      patch.resolvedBy = null;
      patch.resolvedAt = null;
    }

    await issue.update(patch);
    res.json(await InventoryIssue.findByPk(issue.id, { include: issueInclude }));
  } catch (error) {
    next(error);
  }
};

// =================== Для личного кабинета педагога ===================

exports.getMyInventory = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const allowed = await resolveAllowedBranchIds(req, tid);

    const branchWhere = { tenantId: tid };
    if (allowed !== null) branchWhere.id = { [Op.in]: allowed };
    const branches = await Branch.findAll({
      where: branchWhere,
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    const unitWhere = scopeByBranches({ tenantId: tid }, allowed);
    const units = await InventoryUnit.findAll({
      where: unitWhere,
      include: unitInclude,
      order: [['inventoryNumber', 'ASC']],
    });

    const balanceWhere = scopeByBranches({ tenantId: tid }, allowed);
    const balances = await InventoryBalance.findAll({
      where: balanceWhere,
      include: balanceInclude,
      order: [['updatedAt', 'DESC']],
    });

    res.json({
      branches,
      units,
      balances: balances.map((balance) => {
        const json = balance.toJSON();
        const quantity = toNumber(json.quantity);
        const minQuantity = toNumber(json.item?.minQuantity);
        return {
          ...json,
          quantity,
          isLowStock: minQuantity > 0 && quantity <= minQuantity,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

// =================== Выгрузка .xlsx ===================

exports.exportXlsx = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { branchId } = req.query;

    const units = await InventoryUnit.findAll({
      where: { tenantId: tid, ...branchFilter(branchId) },
      include: unitInclude,
      order: [['inventoryNumber', 'ASC']],
    });

    const balances = await InventoryBalance.findAll({
      where: { tenantId: tid, ...branchFilter(branchId) },
      include: balanceInclude,
      order: [['updatedAt', 'DESC']],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Педагог';
    workbook.created = new Date();

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      alignment: { vertical: 'middle' },
    };

    const unitsSheet = workbook.addWorksheet('Оборудование');
    unitsSheet.columns = [
      { header: 'Инв. номер', key: 'number', width: 18 },
      { header: 'Название', key: 'name', width: 32 },
      { header: 'Категория', key: 'category', width: 20 },
      { header: 'Филиал', key: 'branch', width: 20 },
      { header: 'Место', key: 'location', width: 20 },
      { header: 'Ответственный', key: 'responsible', width: 22 },
      { header: 'Статус', key: 'status', width: 16 },
      { header: 'Состояние', key: 'condition', width: 16 },
      { header: 'Цена', key: 'price', width: 14 },
      { header: 'Куплено', key: 'purchaseDate', width: 14 },
    ];
    unitsSheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    const statusLabels = {
      in_use: 'в работе',
      repair: 'ремонт',
      written_off: 'списан',
      lost: 'утерян',
    };
    const conditionLabels = {
      new: 'новое',
      good: 'хорошее',
      wear: 'износ',
      broken: 'сломано',
    };

    units.forEach((unit) => {
      unitsSheet.addRow({
        number: unit.inventoryNumber,
        name: unit.item?.name || '',
        category: unit.item?.category?.name || '',
        branch: unit.branch?.name || '',
        location: unit.location || '',
        responsible: unit.responsible?.name || '',
        status: statusLabels[unit.status] || unit.status,
        condition: conditionLabels[unit.condition] || unit.condition,
        price: toMoney(unit.price),
        purchaseDate: unit.purchaseDate || '',
      });
    });
    unitsSheet.getColumn('price').numFmt = '#,##0.00';

    const balancesSheet = workbook.addWorksheet('Расходники');
    balancesSheet.columns = [
      { header: 'Название', key: 'name', width: 32 },
      { header: 'Категория', key: 'category', width: 20 },
      { header: 'Филиал', key: 'branch', width: 20 },
      { header: 'Количество', key: 'quantity', width: 14 },
      { header: 'Ед.', key: 'unit', width: 10 },
      { header: 'Мин. запас', key: 'minQuantity', width: 14 },
      { header: 'Цена', key: 'price', width: 14 },
      { header: 'Сумма', key: 'sum', width: 16 },
    ];
    balancesSheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    balances.forEach((balance) => {
      const quantity = toNumber(balance.quantity);
      const price = toMoney(balance.item?.price);
      balancesSheet.addRow({
        name: balance.item?.name || '',
        category: balance.item?.category?.name || '',
        branch: balance.branch?.name || '',
        quantity,
        unit: balance.item?.unit || 'шт',
        minQuantity: toNumber(balance.item?.minQuantity),
        price,
        sum: toMoney(quantity * price),
      });
    });
    balancesSheet.getColumn('price').numFmt = '#,##0.00';
    balancesSheet.getColumn('sum').numFmt = '#,##0.00';

    const totalUnits = units.reduce((sum, unit) => sum + toMoney(unit.price), 0);
    const totalBalances = balances.reduce(
      (sum, balance) => sum + toNumber(balance.quantity) * toMoney(balance.item?.price),
      0
    );
    unitsSheet.addRow([]);
    const unitsTotalRow = unitsSheet.addRow({ name: 'ИТОГО', price: toMoney(totalUnits) });
    unitsTotalRow.font = { bold: true };
    balancesSheet.addRow([]);
    const balancesTotalRow = balancesSheet.addRow({ name: 'ИТОГО', sum: toMoney(totalBalances) });
    balancesTotalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};
