import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const STATUS_LABELS = {
  in_use: 'в работе',
  repair: 'ремонт',
  written_off: 'списан',
  lost: 'утерян',
};

const CONDITION_LABELS = {
  new: 'новое',
  good: 'хорошее',
  wear: 'износ',
  broken: 'сломано',
};

const ISSUE_TYPE_LABELS = {
  breakdown: 'поломка',
  missing: 'пропажа',
  need_purchase: 'нужно закупить',
  other: 'другое',
};

const ISSUE_STATUS_LABELS = {
  new: 'новая',
  in_progress: 'в работе',
  resolved: 'решено',
  rejected: 'отклонено',
};

const KIND_LABELS = { unit: 'поштучно', bulk: 'по количеству' };

const money = (value) =>
  Number(value || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateRu = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('ru-RU');
};

const Modal = ({ title, onClose, children, footer, wide }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      zIndex: 1000,
    }}
    onClick={onClose}
  >
    <div
      style={{
        width: '100%',
        maxWidth: wide ? 720 : 520,
        maxHeight: '92vh',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: 12,
        padding: 20,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 22,
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          ×
        </button>
      </div>
      {children}
      {footer && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 16,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <label style={{ display: 'block', marginBottom: 10 }}>
    <span
      style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        color: '#475569',
        marginBottom: 4,
      }}
    >
      {label}
    </span>
    {children}
  </label>
);

const selectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  fontSize: 14,
  boxSizing: 'border-box',
};

const FormError = ({ message }) =>
  message ? (
    <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>⚠️ {message}</div>
  ) : null;

// ---------- Приход оборудования / редактирование экземпляра ----------

const UnitFormModal = ({ unit, items, branches, users, onClose, onSaved }) => {
  const isEdit = Boolean(unit);
  const [form, setForm] = useState({
    itemId: unit?.itemId || '',
    branchId: unit?.branchId || '',
    inventoryNumber: unit?.inventoryNumber || '',
    serialNumber: unit?.serialNumber || '',
    condition: unit?.condition || 'good',
    location: unit?.location || '',
    responsibleUserId: unit?.responsibleUserId || '',
    purchaseDate: unit?.purchaseDate || '',
    price: unit?.price ?? '',
    supplier: unit?.supplier || '',
    warrantyUntil: unit?.warrantyUntil || '',
    note: unit?.note || '',
    asExpense: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.patch(`/admin/inventory/units/${unit.id}`, form);
      } else {
        await api.post('/admin/inventory/units', form);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Изменить экземпляр' : 'Приход оборудования'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <FormError message={error} />

      {!isEdit && (
        <>
          <Field label="Позиция номенклатуры">
            <select
              style={selectStyle}
              value={form.itemId}
              onChange={(e) => set('itemId', e.target.value)}
            >
              <option value="">Выберите позицию</option>
              {items
                .filter((item) => item.kind === 'unit')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Филиал">
            <select
              style={selectStyle}
              value={form.branchId}
              onChange={(e) => set('branchId', e.target.value)}
            >
              <option value="">Без филиала</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Инвентарный номер (пусто — сгенерируем)">
            <Input
              value={form.inventoryNumber}
              onChange={(e) => set('inventoryNumber', e.target.value)}
              placeholder="ИНВ-000001"
            />
          </Field>
        </>
      )}

      <Field label="Серийный номер">
        <Input
          value={form.serialNumber}
          onChange={(e) => set('serialNumber', e.target.value)}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Состояние">
          <select
            style={selectStyle}
            value={form.condition}
            onChange={(e) => set('condition', e.target.value)}
          >
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Цена, ₽">
          <Input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Место (кабинет, зал)">
        <Input value={form.location} onChange={(e) => set('location', e.target.value)} />
      </Field>

      <Field label="Ответственный">
        <select
          style={selectStyle}
          value={form.responsibleUserId}
          onChange={(e) => set('responsibleUserId', e.target.value)}
        >
          <option value="">Не назначен</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role})
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Дата покупки">
          <Input
            type="date"
            value={form.purchaseDate || ''}
            onChange={(e) => set('purchaseDate', e.target.value)}
          />
        </Field>
        <Field label="Гарантия до">
          <Input
            type="date"
            value={form.warrantyUntil || ''}
            onChange={(e) => set('warrantyUntil', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Поставщик">
        <Input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
      </Field>

      <Field label="Примечание">
        <Input value={form.note} onChange={(e) => set('note', e.target.value)} />
      </Field>

      {!isEdit && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={form.asExpense}
            onChange={(e) => set('asExpense', e.target.checked)}
          />
          Учесть покупку как расход в финансах
        </label>
      )}
    </Modal>
  );
};

// ---------- Перемещение ----------

const TransferModal = ({ unit, branches, onClose, onSaved }) => {
  const [branchId, setBranchId] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/admin/inventory/units/${unit.id}/transfer`, { branchId, comment });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось переместить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Перемещение ${unit.inventoryNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={saving || !branchId}>
            {saving ? 'Сохраняем...' : 'Переместить'}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <Field label="В филиал">
        <select style={selectStyle} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">Выберите филиал</option>
          {branches
            .filter((branch) => branch.id !== unit.branchId)
            .map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Комментарий">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
    </Modal>
  );
};

// ---------- Списание экземпляра ----------

const printWriteOffAct = (unit, movement) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Акт списания</title>
  <style>
    body{font-family:Arial,sans-serif;padding:32px;color:#111}
    h1{font-size:18px;margin:0 0 4px}
    .muted{color:#555;font-size:12px}
    table{border-collapse:collapse;width:100%;margin-top:18px}
    th,td{border:1px solid #000;padding:6px 8px;font-size:12px;text-align:left}
    th{width:35%;background:#f3f4f6}
    .sign{margin-top:36px;display:flex;justify-content:space-between;font-size:12px}
  </style></head><body>
  <h1>Акт списания материальных ценностей</h1>
  <div class="muted">Дата: ${dateRu(movement?.occurredAt || new Date())}</div>
  <table>
    <tr><th>Инвентарный номер</th><td>${unit.inventoryNumber || ''}</td></tr>
    <tr><th>Наименование</th><td>${unit.item?.name || ''}</td></tr>
    <tr><th>Категория</th><td>${unit.item?.category?.name || ''}</td></tr>
    <tr><th>Филиал</th><td>${unit.branch?.name || ''}</td></tr>
    <tr><th>Ответственный</th><td>${unit.responsible?.name || ''}</td></tr>
    <tr><th>Стоимость</th><td>${money(unit.price)} ₽</td></tr>
    <tr><th>Причина списания</th><td>${movement?.comment || ''}</td></tr>
    <tr><th>Документ</th><td>${movement?.documentNumber || '—'}</td></tr>
  </table>
  <div class="sign">
    <span>Сдал: ______________________</span>
    <span>Принял: ______________________</span>
  </div>
  <script>window.print()</script>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

const WriteOffUnitModal = ({ unit, onClose, onSaved }) => {
  const [comment, setComment] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(`/admin/inventory/units/${unit.id}/write-off`, {
        comment,
        documentNumber,
      });
      onSaved(data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось списать');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Списать ${unit.inventoryNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving}>
            {saving ? 'Списываем...' : 'Списать и напечатать акт'}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <Field label="Причина списания">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      <Field label="Номер документа">
        <Input
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="например, АКТ-12"
        />
      </Field>
    </Modal>
  );
};

// ---------- Приход расходников ----------

const BalanceReceiptModal = ({ items, branches, onClose, onSaved }) => {
  const [form, setForm] = useState({
    itemId: '',
    branchId: '',
    quantity: '',
    price: '',
    comment: '',
    asExpense: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/inventory/balances/receipt', form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось оприходовать');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Приход расходников"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <Field label="Позиция">
        <select style={selectStyle} value={form.itemId} onChange={(e) => set('itemId', e.target.value)}>
          <option value="">Выберите позицию</option>
          {items
            .filter((item) => item.kind === 'bulk')
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.unit})
              </option>
            ))}
        </select>
      </Field>
      <Field label="Филиал">
        <select style={selectStyle} value={form.branchId} onChange={(e) => set('branchId', e.target.value)}>
          <option value="">Выберите филиал</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Количество">
          <Input
            type="number"
            step="0.01"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </Field>
        <Field label="Цена за единицу">
          <Input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Комментарий">
        <Input value={form.comment} onChange={(e) => set('comment', e.target.value)} />
      </Field>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={form.asExpense}
          onChange={(e) => set('asExpense', e.target.checked)}
        />
        Учесть закупку как расход в финансах
      </label>
    </Modal>
  );
};

// ---------- Списание расходников ----------

const BalanceWriteOffModal = ({ balance, onClose, onSaved }) => {
  const [quantity, setQuantity] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/inventory/balances/write-off', {
        itemId: balance.itemId,
        branchId: balance.branchId,
        quantity,
        comment,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось списать');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Списание: ${balance.item?.name || ''}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving}>
            {saving ? 'Списываем...' : 'Списать'}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
        Есть: {balance.quantity} {balance.item?.unit || 'шт'}
      </div>
      <Field label="Количество">
        <Input
          type="number"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </Field>
      <Field label="Комментарий">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
    </Modal>
  );
};

// ---------- Позиция номенклатуры ----------

const ItemFormModal = ({ item, categories, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: item?.name || '',
    categoryId: item?.categoryId || '',
    kind: item?.kind || 'unit',
    unit: item?.unit || 'шт',
    price: item?.price ?? '',
    minQuantity: item?.minQuantity ?? '',
    note: item?.note || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (item) await api.patch(`/admin/inventory/items/${item.id}`, form);
      else await api.post('/admin/inventory/items', form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? 'Изменить позицию' : 'Новая позиция'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <Field label="Название">
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Категория">
          <select
            style={selectStyle}
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">Без категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Учёт">
          <select style={selectStyle} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="unit">поштучно</option>
            <option value="bulk">по количеству</option>
          </select>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Единица">
          <Input value={form.unit} onChange={(e) => set('unit', e.target.value)} />
        </Field>
        <Field label="Цена по умолчанию">
          <Input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
        </Field>
      </div>
      {form.kind === 'bulk' && (
        <Field label="Минимальный запас">
          <Input
            type="number"
            step="0.01"
            value={form.minQuantity}
            onChange={(e) => set('minQuantity', e.target.value)}
          />
        </Field>
      )}
      <Field label="Примечание">
        <Input value={form.note} onChange={(e) => set('note', e.target.value)} />
      </Field>
    </Modal>
  );
};

// ---------- Категория ----------

const CategoryFormModal = ({ category, onClose, onSaved }) => {
  const [name, setName] = useState(category?.name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (category) await api.patch(`/admin/inventory/categories/${category.id}`, { name });
      else await api.post('/admin/inventory/categories', { name });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={category ? 'Изменить категорию' : 'Новая категория'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <Field label="Название">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
    </Modal>
  );
};

// ---------- Заявка ----------

const IssueModal = ({ issue, onClose, onSaved }) => {
  const [status, setStatus] = useState(issue.status);
  const [comment, setComment] = useState(issue.resolutionComment || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/admin/inventory/issues/${issue.id}`, {
        status,
        resolutionComment: comment,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Заявка"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
        {ISSUE_TYPE_LABELS[issue.type]} · {issue.author?.name || 'педагог'} ·{' '}
        {issue.branch?.name || 'без филиала'}
      </div>
      <div
        style={{
          background: '#f8fafc',
          borderRadius: 8,
          padding: 10,
          fontSize: 13,
          marginBottom: 12,
        }}
      >
        {issue.comment}
      </div>
      <Field label="Статус">
        <select style={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(ISSUE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Комментарий администратора">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
    </Modal>
  );
};

// ---------- Страница ----------

const InventoryPage = () => {
  const [tab, setTab] = useState('units');
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [data, setData] = useState({
    summary: null,
    units: [],
    balances: [],
    items: [],
    categories: [],
    issues: [],
    branches: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [lastAct, setLastAct] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = branchId ? { branchId } : {};
      const [
        summary,
        units,
        balances,
        items,
        categories,
        issues,
        branches,
        usersRes,
      ] = await Promise.all([
        api.get('/admin/inventory/summary', { params }),
        api.get('/admin/inventory/units', { params }),
        api.get('/admin/inventory/balances', { params }),
        api.get('/admin/inventory/items'),
        api.get('/admin/inventory/categories'),
        api.get('/admin/inventory/issues', { params }),
        api.get('/admin/branches'),
        api.get('/admin/users', { params: { limit: 500 } }),
      ]);

      setData({
        summary: summary.data,
        units: units.data || [],
        balances: balances.data || [],
        items: items.data || [],
        categories: categories.data || [],
        issues: issues.data || [],
        branches: branches.data || [],
        users: usersRes.data?.users || usersRes.data?.rows || [],
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось загрузить имущество');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const query = search.trim().toLowerCase();

  const units = useMemo(
    () =>
      data.units.filter((unit) => {
        if (statusFilter && unit.status !== statusFilter) return false;
        if (!query) return true;
        return [unit.item?.name, unit.inventoryNumber, unit.location, unit.serialNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }),
    [data.units, statusFilter, query]
  );

  const balances = useMemo(
    () =>
      data.balances.filter((balance) => {
        if (!query) return true;
        return [balance.item?.name, balance.branch?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }),
    [data.balances, query]
  );

  const items = useMemo(
    () =>
      data.items.filter((item) => {
        if (!query) return true;
        return [item.name, item.category?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }),
    [data.items, query]
  );

  const categories = useMemo(
    () =>
      data.categories.filter((category) => {
        if (!query) return true;
        return String(category.name).toLowerCase().includes(query);
      }),
    [data.categories, query]
  );

  const issues = useMemo(
    () =>
      data.issues.filter((issue) => {
        if (!query) return true;
        return [issue.comment, issue.author?.name, issue.item?.name, issue.unit?.inventoryNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }),
    [data.issues, query]
  );

  const changeUnitStatus = async (unit, status) => {
    const labels = { repair: 'Отправить в ремонт?', in_use: 'Вернуть в работу?' };
    if (!window.confirm(labels[status] || 'Изменить статус?')) return;
    try {
      await api.post(`/admin/inventory/units/${unit.id}/status`, { status });
      reload();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось изменить статус');
    }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Удалить позицию «${item.name}»?`)) return;
    try {
      await api.delete(`/admin/inventory/items/${item.id}`);
      reload();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось удалить');
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Удалить категорию «${category.name}»?`)) return;
    try {
      await api.delete(`/admin/inventory/categories/${category.id}`);
      reload();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось удалить');
    }
  };

  const downloadXlsx = async () => {
    try {
      const response = await api.get('/admin/inventory/export.xlsx', {
        params: branchId ? { branchId } : {},
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.alert('Не удалось выгрузить файл');
    }
  };

  const summary = data.summary || {};

  const tabButton = (key, label, count) => (
    <button
      key={key}
      type="button"
      onClick={() => setTab(key)}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        background: tab === key ? '#2563eb' : '#fff',
        color: tab === key ? '#fff' : '#0f172a',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {label}
      {typeof count === 'number' ? ` · ${count}` : ''}
    </button>
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Имущество</h1>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Оборудование поштучно, расходники по количеству, история операций и заявки педагогов.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={downloadXlsx}>
            📊 Скачать .xlsx
          </Button>
          {tab === 'units' && (
            <Button onClick={() => setModal({ type: 'unit' })}>+ Приход оборудования</Button>
          )}
          {tab === 'balances' && (
            <Button onClick={() => setModal({ type: 'balance' })}>+ Приход расходников</Button>
          )}
          {tab === 'items' && (
            <Button onClick={() => setModal({ type: 'item' })}>+ Позиция</Button>
          )}
          {tab === 'categories' && (
            <Button onClick={() => setModal({ type: 'category' })}>+ Категория</Button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Оборудование в работе</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {summary.unitsCount ?? 0} шт
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{money(summary.unitsValue)} ₽</div>
        </Card>
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Расходники</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{money(summary.balancesValue)} ₽</div>
          <div style={{ fontSize: 12, color: '#b45309' }}>
            мало на складе: {summary.lowStockCount ?? 0}
          </div>
        </Card>
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Всего на сумму</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{money(summary.totalValue)} ₽</div>
        </Card>
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Списано</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.writtenOffCount ?? 0} шт</div>
        </Card>
        <Card style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Открытых заявок</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.openIssues ?? 0}</div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          style={{ ...selectStyle, width: 200 }}
        >
          <option value="">Все филиалы</option>
          {data.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: название, номер, место…"
          style={{ ...selectStyle, width: 260 }}
        />
        {tab === 'units' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...selectStyle, width: 180 }}
          >
            <option value="">Любой статус</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {tabButton('units', 'Оборудование', data.units.length)}
        {tabButton('balances', 'Расходники', data.balances.length)}
        {tabButton('items', 'Номенклатура', data.items.length)}
        {tabButton('issues', 'Заявки', data.issues.length)}
        {tabButton('categories', 'Категории', data.categories.length)}
      </div>

      {lastAct && (
        <Card
          style={{
            padding: 12,
            marginBottom: 12,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 13 }}>
            Списано: {lastAct.unit?.item?.name} · {lastAct.unit?.inventoryNumber}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              onClick={() => printWriteOffAct(lastAct.unit, lastAct.movement)}
            >
              🖨 Напечатать акт
            </Button>
            <Button variant="secondary" onClick={() => setLastAct(null)}>
              Скрыть
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <div style={{ color: '#b91c1c', marginBottom: 12 }}>⚠️ {error}</div>
      )}
      {loading && <div style={{ color: '#64748b' }}>Загрузка...</div>}

      {!loading && tab === 'units' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {units.length === 0 && <Card style={{ padding: 16, color: '#64748b' }}>Пока нет оборудования</Card>}
          {units.map((unit) => (
            <Card key={unit.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>
                    {unit.item?.name || 'Без названия'}{' '}
                    <span style={{ color: '#64748b', fontSize: 12 }}>{unit.inventoryNumber}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {[
                      unit.item?.category?.name,
                      unit.branch?.name || 'без филиала',
                      unit.location,
                      unit.responsible?.name,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Статус: {STATUS_LABELS[unit.status] || unit.status} · Состояние:{' '}
                    {CONDITION_LABELS[unit.condition] || unit.condition} · {money(unit.price)} ₽
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setModal({ type: 'unit', unit })}
                  >
                    Изменить
                  </Button>
                  {unit.status === 'in_use' && (
                    <Button
                      variant="secondary"
                      onClick={() => setModal({ type: 'transfer', unit })}
                    >
                      Переместить
                    </Button>
                  )}
                  {unit.status === 'in_use' && (
                    <Button variant="secondary" onClick={() => changeUnitStatus(unit, 'repair')}>
                      В ремонт
                    </Button>
                  )}
                  {unit.status === 'repair' && (
                    <Button variant="secondary" onClick={() => changeUnitStatus(unit, 'in_use')}>
                      Вернуть
                    </Button>
                  )}
                  {unit.status !== 'written_off' && (
                    <Button
                      variant="danger"
                      onClick={() => setModal({ type: 'writeoff', unit })}
                    >
                      Списать
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'balances' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {balances.length === 0 && (
            <Card style={{ padding: 16, color: '#64748b' }}>Пока нет расходников</Card>
          )}
          {balances.map((balance) => (
            <Card key={balance.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>{balance.item?.name || 'Без названия'}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {[balance.item?.category?.name, balance.branch?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Остаток: <strong>{balance.quantity}</strong> {balance.item?.unit || 'шт'}
                    {balance.isLowStock && (
                      <span style={{ color: '#b45309' }}> · мало (мин. {balance.item?.minQuantity})</span>
                    )}
                    {' · '}
                    {money(Number(balance.quantity) * Number(balance.item?.price || 0))} ₽
                  </div>
                </div>
                <Button variant="danger" onClick={() => setModal({ type: 'balance-writeoff', balance })}>
                  Списать
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'items' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.length === 0 && <Card style={{ padding: 16, color: '#64748b' }}>Номенклатура пуста</Card>}
          {items.map((item) => (
            <Card key={item.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {[
                      item.category?.name,
                      KIND_LABELS[item.kind] || item.kind,
                      item.unit,
                      item.price ? `${money(item.price)} ₽` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setModal({ type: 'item', item })}>
                  Изменить
                </Button>
                <Button variant="danger" onClick={() => removeItem(item)}>
                  Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'issues' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {issues.length === 0 && <Card style={{ padding: 16, color: '#64748b' }}>Заявок пока нет</Card>}
          {issues.map((issue) => (
            <Card key={issue.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>
                    {ISSUE_TYPE_LABELS[issue.type] || issue.type} ·{' '}
                    <span style={{ fontWeight: 500, fontSize: 12, color: '#64748b' }}>
                      {ISSUE_STATUS_LABELS[issue.status] || issue.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {[
                      issue.author?.name,
                      issue.branch?.name,
                      issue.item?.name || issue.unit?.inventoryNumber,
                      dateRu(issue.createdAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>{issue.comment}</div>
                  {issue.resolutionComment && (
                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
                      Ответ: {issue.resolutionComment}
                    </div>
                  )}
                </div>
                <Button variant="secondary" onClick={() => setModal({ type: 'issue', issue })}>
                  Обработать
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && tab === 'categories' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {categories.length === 0 && (
            <Card style={{ padding: 16, color: '#64748b' }}>Категорий пока нет</Card>
          )}
          {categories.map((category) => (
            <Card key={category.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{category.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>позиций: {category.itemsCount || 0}</div>
                </div>
                <Button variant="secondary" onClick={() => setModal({ type: 'category', category })}>
                  Изменить
                </Button>
                <Button variant="danger" onClick={() => removeCategory(category)}>
                  Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal?.type === 'unit' && (
        <UnitFormModal
          unit={modal.unit}
          items={data.items}
          branches={data.branches}
          users={data.users}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.type === 'transfer' && (
        <TransferModal
          unit={modal.unit}
          branches={data.branches}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.type === 'writeoff' && (
        <WriteOffUnitModal
          unit={modal.unit}
          onClose={() => setModal(null)}
          onSaved={(data) => {
            setLastAct(data);
            reload();
          }}
        />
      )}
      {modal?.type === 'balance' && (
        <BalanceReceiptModal
          items={data.items}
          branches={data.branches}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.type === 'balance-writeoff' && (
        <BalanceWriteOffModal
          balance={modal.balance}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.type === 'item' && (
        <ItemFormModal
          item={modal.item}
          categories={data.categories}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.type === 'category' && (
        <CategoryFormModal
          category={modal.category}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.type === 'issue' && (
        <IssueModal
          issue={modal.issue}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
};

export default InventoryPage;
