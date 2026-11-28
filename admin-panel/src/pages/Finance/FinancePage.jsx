import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../utils/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const money = (value) =>
  Number(value || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pad2 = (value) => String(value).padStart(2, '0');

const lastDay = (year, month) => {
  const date = new Date(Date.UTC(year, month, 0));
  return `${year}-${pad2(month)}-${pad2(date.getUTCDate())}`;
};

const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

const monthLabel = (period) => {
  if (!period) return '';
  const [year, month] = String(period).split('-');
  const name = MONTH_NAMES[Number(month) - 1] || month;
  return `${name} ${year}`;
};

const METHOD_LABELS = {
  cash: 'наличные',
  card: 'карта',
  transfer: 'перевод',
  other: 'другое',
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
          style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#64748b' }}
        >
          ×
        </button>
      </div>
      {children}
      {footer && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          {footer}
        </div>
      )}
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <label style={{ display: 'block', marginBottom: 10 }}>
    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
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
  message ? <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>⚠️ {message}</div> : null;

// ---------- Форма операции ----------

const TransactionModal = ({ transaction, categories, branches, onClose, onSaved }) => {
  const [form, setForm] = useState({
    type: transaction?.type || 'income',
    amount: transaction?.amount ?? '',
    occurredAt: transaction?.occurredAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    branchId: transaction?.branchId || '',
    categoryId: transaction?.categoryId || '',
    method: transaction?.method || 'other',
    comment: transaction?.comment || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (transaction) await api.patch(`/admin/finance/transactions/${transaction.id}`, form);
      else await api.post('/admin/finance/transactions', form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось сохранить операцию');
    } finally {
      setSaving(false);
    }
  };

  const typeCategories = categories.filter((category) => category.type === form.type);

  return (
    <Modal
      title={transaction ? 'Изменить операцию' : 'Новая операция'}
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <Button
          variant={form.type === 'income' ? 'primary' : 'secondary'}
          onClick={() => {
            set('type', 'income');
            set('categoryId', '');
          }}
        >
          Доход
        </Button>
        <Button
          variant={form.type === 'expense' ? 'primary' : 'secondary'}
          onClick={() => {
            set('type', 'expense');
            set('categoryId', '');
          }}
        >
          Расход
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Сумма, ₽">
          <Input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </Field>
        <Field label="Дата">
          <Input
            type="date"
            value={form.occurredAt}
            onChange={(e) => set('occurredAt', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Категория">
        <select style={selectStyle} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
          <option value="">Без категории</option>
          {typeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Филиал">
          <select style={selectStyle} value={form.branchId} onChange={(e) => set('branchId', e.target.value)}>
            <option value="">Весь центр</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Способ">
          <select style={selectStyle} value={form.method} onChange={(e) => set('method', e.target.value)}>
            {Object.entries(METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Комментарий">
        <Input value={form.comment} onChange={(e) => set('comment', e.target.value)} />
      </Field>
    </Modal>
  );
};

// ---------- Форма оплаты ----------

const PaymentModal = ({ childrenList, debts, month, onClose, onSaved }) => {
  const [form, setForm] = useState({
    childId: '',
    amount: '',
    occurredAt: `${month}-01`,
    method: 'cash',
    comment: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const debtByChild = useMemo(() => {
    const map = new Map();
    (debts || []).forEach((row) => map.set(row.childId, row));
    return map;
  }, [debts]);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/finance/payments', form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось сохранить оплату');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Внести оплату"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={saving || !form.childId}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <FormError message={error} />

      <Field label="Ребёнок">
        <select style={selectStyle} value={form.childId} onChange={(e) => set('childId', e.target.value)}>
          <option value="">Выберите ребёнка</option>
          {(childrenList || []).map((child) => {
            const debtRow = debtByChild.get(child.id);
            return (
              <option key={child.id} value={child.id}>
                {[child.surname, child.name].filter(Boolean).join(' ') || child.name}
                {debtRow?.branchName ? ` · ${debtRow.branchName}` : ''}
                {debtRow ? ` · долг ${money(debtRow.debt)} ₽` : ''}
              </option>
            );
          })}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Сумма, ₽">
          <Input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </Field>
        <Field label="Дата">
          <Input type="date" value={form.occurredAt} onChange={(e) => set('occurredAt', e.target.value)} />
        </Field>
      </div>

      <Field label="Способ">
        <select style={selectStyle} value={form.method} onChange={(e) => set('method', e.target.value)}>
          {Object.entries(METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Комментарий">
        <Input value={form.comment} onChange={(e) => set('comment', e.target.value)} />
      </Field>
    </Modal>
  );
};

// ---------- Категория ----------

const CategoryModal = ({ category, onClose, onSaved }) => {
  const [form, setForm] = useState({
    type: category?.type || 'income',
    name: category?.name || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (category) await api.patch(`/admin/finance/categories/${category.id}`, { name: form.name });
      else await api.post('/admin/finance/categories', form);
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
      {!category && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Button variant={form.type === 'income' ? 'primary' : 'secondary'} onClick={() => setForm((p) => ({ ...p, type: 'income' }))}>
            Доходная
          </Button>
          <Button variant={form.type === 'expense' ? 'primary' : 'secondary'} onClick={() => setForm((p) => ({ ...p, type: 'expense' }))}>
            Расходная
          </Button>
        </div>
      )}
      <Field label="Название">
        <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
      </Field>
    </Modal>
  );
};

// ---------- Страница ----------

const FinancePage = () => {
  const now = new Date();
  const [tab, setTab] = useState('overview');
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [customFrom, setCustomFrom] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`);
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState('');

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [debts, setDebts] = useState({ items: [], totals: {} });
  const [payments, setPayments] = useState([]);
  const [childrenList, setChildrenList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [txType, setTxType] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const range = useMemo(() => {
    if (mode === 'custom') return { from: customFrom, to: customTo };
    if (mode === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` };
    if (mode === 'quarter') {
      const [yy, mm] = month.split('-').map(Number);
      const startMonth = Math.floor((mm - 1) / 3) * 3 + 1;
      const endMonth = startMonth + 2;
      return { from: `${yy}-${pad2(startMonth)}-01`, to: lastDay(yy, endMonth) };
    }
    const [yy, mm] = month.split('-').map(Number);
    return { from: `${month}-01`, to: lastDay(yy, mm) };
  }, [mode, month, year, customFrom, customTo]);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { from: range.from, to: range.to, ...(branchId ? { branchId } : {}) };
      const [summaryRes, categoriesRes, branchesRes, childrenRes] = await Promise.all([
        api.get('/admin/finance/summary', { params }),
        api.get('/admin/finance/categories'),
        api.get('/admin/branches'),
        api.get('/admin/children/available'),
      ]);
      setSummary(summaryRes.data);
      setCategories(categoriesRes.data || []);
      setBranches(branchesRes.data || []);
      setChildrenList(childrenRes.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось загрузить финансы');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, branchId]);

  const loadTransactions = useCallback(async () => {
    try {
      const params = {
        from: range.from,
        to: range.to,
        ...(branchId ? { branchId } : {}),
        ...(txType ? { type: txType } : {}),
        ...(txSearch.trim() ? { search: txSearch.trim() } : {}),
      };
      const { data } = await api.get('/admin/finance/transactions', { params });
      setTransactions(data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось загрузить операции');
    }
  }, [range.from, range.to, branchId, txType, txSearch]);

  const loadPayments = useCallback(async () => {
    try {
      const params = { period: month, ...(branchId ? { branchId } : {}) };
      const [debtsRes, paymentsRes] = await Promise.all([
        api.get('/admin/finance/debts', { params }),
        api.get('/admin/finance/payments', {
          params: { from: `${month}-01`, to: lastDay(...month.split('-').map(Number)), ...(branchId ? { branchId } : {}) },
        }),
      ]);
      setDebts(debtsRes.data || { items: [], totals: {} });
      setPayments(paymentsRes.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось загрузить оплаты');
    }
  }, [month, branchId]);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (tab !== 'transactions') return undefined;
    const timer = setTimeout(() => loadTransactions(), 400);
    return () => clearTimeout(timer);
  }, [tab, loadTransactions]);

  useEffect(() => {
    if (tab === 'payments') loadPayments();
  }, [tab, loadPayments]);

  const generateCharges = async () => {
    if (!window.confirm(`Сформировать начисления за ${monthLabel(month)}?`)) return;
    try {
      const { data } = await api.post('/admin/finance/charges/generate', {
        period: month,
        ...(branchId ? { branchId } : {}),
      });
      setActionMessage(data.message || 'Начисления сформированы');
      loadPayments();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось сформировать начисления');
    }
  };

  const generateSalary = async () => {
    if (!window.confirm(`Начислить зарплату за ${monthLabel(month)} как расход?`)) return;
    try {
      const { data } = await api.post('/admin/finance/salary/generate', { period: month });
      setActionMessage(data.message || 'Зарплата начислена');
      loadBase();
      if (tab === 'transactions') loadTransactions();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось начислить зарплату');
    }
  };

  const removeTransaction = async (transaction) => {
    if (!window.confirm('Удалить операцию?')) return;
    try {
      await api.delete(`/admin/finance/transactions/${transaction.id}`);
      loadTransactions();
      loadBase();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось удалить');
    }
  };

  const removePayment = async (payment) => {
    if (!window.confirm('Удалить оплату? Связанный доход тоже удалится.')) return;
    try {
      await api.delete(`/admin/finance/payments/${payment.id}`);
      loadPayments();
      loadBase();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось удалить оплату');
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Удалить категорию «${category.name}»?`)) return;
    try {
      await api.delete(`/admin/finance/categories/${category.id}`);
      loadBase();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Не удалось удалить категорию');
    }
  };

  const totals = summary?.totals || {};

  const tabButton = (key, label) => (
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
          <h1 style={{ margin: 0 }}>Финансы</h1>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            Доходы и расходы центра и филиалов, оплаты родителей, зарплата.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tab === 'transactions' && (
            <Button onClick={() => setModal({ type: 'transaction' })}>+ Операция</Button>
          )}
          {tab === 'payments' && (
            <>
              <Button variant="secondary" onClick={generateCharges}>
                Начисления за месяц
              </Button>
              <Button variant="secondary" onClick={generateSalary}>
                Начислить зарплату
              </Button>
              <Button onClick={() => setModal({ type: 'payment' })}>+ Оплата</Button>
            </>
          )}
          {tab === 'categories' && (
            <Button onClick={() => setModal({ type: 'category' })}>+ Категория</Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ ...selectStyle, width: 150 }}>
          <option value="month">Месяц</option>
          <option value="quarter">Квартал</option>
          <option value="year">Год</option>
          <option value="custom">Период</option>
        </select>

        {(mode === 'month' || mode === 'quarter') && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ ...selectStyle, width: 170 }}
          />
        )}
        {mode === 'year' && (
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ ...selectStyle, width: 120 }}
          />
        )}
        {mode === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ ...selectStyle, width: 170 }} />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ ...selectStyle, width: 170 }} />
          </>
        )}

        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={{ ...selectStyle, width: 200 }}>
          <option value="">Все филиалы</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {range.from} — {range.to}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {tabButton('overview', 'Обзор')}
        {tabButton('transactions', 'Операции')}
        {tabButton('payments', 'Оплаты родителей')}
        {tabButton('categories', 'Категории')}
      </div>

      {actionMessage && (
        <Card style={{ padding: 12, marginBottom: 12, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          {actionMessage}
        </Card>
      )}
      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>⚠️ {error}</div>}
      {loading && tab === 'overview' && <div style={{ color: '#64748b' }}>Загрузка...</div>}

      {!loading && tab === 'overview' && summary && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Card style={{ padding: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Доходы</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d' }}>{money(totals.income)} ₽</div>
            </Card>
            <Card style={{ padding: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Расходы</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c' }}>{money(totals.expense)} ₽</div>
            </Card>
            <Card style={{ padding: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Прибыль</div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: Number(totals.profit) >= 0 ? '#15803d' : '#b91c1c',
                }}
              >
                {money(totals.profit)} ₽
              </div>
            </Card>
            <Card style={{ padding: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Операций</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{totals.operations || 0}</div>
            </Card>
          </div>

          <Card style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Доходы и расходы по месяцам</h3>
            {summary.monthly.length === 0 ? (
              <div style={{ color: '#64748b' }}>За период операций нет</div>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={summary.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${money(value)} ₽`} />
                    <Legend />
                    <Bar dataKey="income" name="Доходы" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Расходы" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <Card style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Структура расходов</h3>
              {summary.byCategory.expense.length === 0 ? (
                <div style={{ color: '#64748b' }}>Расходов нет</div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={summary.byCategory.expense}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {summary.byCategory.expense.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${money(value)} ₽`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Структура доходов</h3>
              {summary.byCategory.income.length === 0 ? (
                <div style={{ color: '#64748b' }}>Доходов нет</div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={summary.byCategory.income}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {summary.byCategory.income.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${money(value)} ₽`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          {summary.byBranch.length > 1 && (
            <Card style={{ padding: 16, marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Доходы и расходы по филиалам</h3>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={summary.byBranch}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="branchName" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${money(value)} ₽`} />
                    <Legend />
                    <Bar dataKey="income" name="Доходы" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Расходы" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'transactions' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <select value={txType} onChange={(e) => setTxType(e.target.value)} style={{ ...selectStyle, width: 160 }}>
              <option value="">Все операции</option>
              <option value="income">Только доходы</option>
              <option value="expense">Только расходы</option>
            </select>
            <input
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Поиск по комментарию"
              style={{ ...selectStyle, width: 240 }}
            />
          </div>

          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Дата</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Тип</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Категория</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Филиал</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Сумма</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Комментарий</th>
                  <th style={{ padding: 8 }} />
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 12, color: '#64748b' }}>
                      Операций за период нет
                    </td>
                  </tr>
                )}
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{tx.occurredAt}</td>
                    <td style={{ padding: 8, color: tx.type === 'income' ? '#15803d' : '#b91c1c' }}>
                      {tx.type === 'income' ? 'доход' : 'расход'}
                    </td>
                    <td style={{ padding: 8 }}>{tx.category?.name || '—'}</td>
                    <td style={{ padding: 8 }}>{tx.branch?.name || 'центр'}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{money(tx.amount)} ₽</td>
                    <td style={{ padding: 8, fontSize: 13 }}>{tx.comment || ''}</td>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                      {tx.source === 'manual' && (
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'transaction', transaction: tx })}
                          style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer' }}
                        >
                          Изменить
                        </button>
                      )}
                      {tx.source !== 'payment' ? (
                        <button
                          type="button"
                          onClick={() => removeTransaction(tx)}
                          style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}
                        >
                          Удалить
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>из оплаты</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'payments' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ ...selectStyle, width: 170 }}
            />
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Начислено: {money(debts.totals?.charged)} ₽ · Оплачено: {money(debts.totals?.paid)} ₽ · Долг:{' '}
              <strong style={{ color: Number(debts.totals?.debt) > 0 ? '#b91c1c' : '#15803d' }}>
                {money(debts.totals?.debt)} ₽
              </strong>
            </span>
          </div>

          <div className="table-scroll" style={{ marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Ребёнок</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Филиал</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Начислено</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Оплачено</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Долг</th>
                </tr>
              </thead>
              <tbody>
                {(debts.items || []).length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, color: '#64748b' }}>
                      Начислений за месяц нет. Нажмите «Начисления за месяц».
                    </td>
                  </tr>
                )}
                {(debts.items || []).map((row) => (
                  <tr key={row.childId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{row.childName}</td>
                    <td style={{ padding: 8 }}>{row.branchName || '—'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{money(row.charged)} ₽</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{money(row.paid)} ₽</td>
                    <td
                      style={{
                        padding: 8,
                        textAlign: 'right',
                        fontWeight: 600,
                        color: Number(row.debt) > 0 ? '#b91c1c' : '#15803d',
                      }}
                    >
                      {money(row.debt)} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Оплаты за месяц</h3>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Дата</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Ребёнок</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Филиал</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Способ</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Сумма</th>
                  <th style={{ padding: 8 }} />
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 12, color: '#64748b' }}>
                      Оплат нет
                    </td>
                  </tr>
                )}
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{payment.occurredAt}</td>
                    <td style={{ padding: 8 }}>
                      {[payment.child?.surname, payment.child?.name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td style={{ padding: 8 }}>{payment.branch?.name || '—'}</td>
                    <td style={{ padding: 8 }}>{METHOD_LABELS[payment.method] || payment.method}</td>
                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{money(payment.amount)} ₽</td>
                    <td style={{ padding: 8 }}>
                      <button
                        type="button"
                        onClick={() => removePayment(payment)}
                        style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {['income', 'expense'].map((type) => (
            <Card key={type} style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>{type === 'income' ? 'Доходные' : 'Расходные'}</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {categories
                  .filter((category) => category.type === type)
                  .map((category) => (
                    <div
                      key={category.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <span>{category.name}</span>
                      <span style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'category', category })}
                          style={{ border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer' }}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}
                        >
                          Удалить
                        </button>
                      </span>
                    </div>
                  ))}
                {categories.filter((category) => category.type === type).length === 0 && (
                  <div style={{ color: '#64748b' }}>Пока нет категорий</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal?.type === 'transaction' && (
        <TransactionModal
          transaction={modal.transaction}
          categories={categories}
          branches={branches}
          onClose={() => setModal(null)}
          onSaved={() => {
            loadTransactions();
            loadBase();
          }}
        />
      )}
      {modal?.type === 'payment' && (
        <PaymentModal
          childrenList={childrenList}
          debts={debts.items || []}
          month={month}
          onClose={() => setModal(null)}
          onSaved={() => {
            loadPayments();
            loadBase();
          }}
        />
      )}
      {modal?.type === 'category' && (
        <CategoryModal
          category={modal.category}
          onClose={() => setModal(null)}
          onSaved={loadBase}
        />
      )}
    </div>
  );
};

export default FinancePage;
