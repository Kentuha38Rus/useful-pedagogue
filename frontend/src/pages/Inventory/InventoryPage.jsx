import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import Card from '../../components/common/Card';

const TYPE_LABELS = {
  breakdown: 'Поломка',
  missing: 'Пропажа',
  need_purchase: 'Нужно закупить',
  other: 'Другое',
};

const STATUS_LABELS = {
  in_use: 'в работе',
  repair: 'в ремонте',
  written_off: 'списан',
  lost: 'утерян',
};

const ISSUE_STATUS_LABELS = {
  new: 'новая',
  in_progress: 'в работе',
  resolved: 'решено',
  rejected: 'отклонено',
};

const money = (value) =>
  Number(value || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const InventoryPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState({ branches: [], units: [], balances: [] });
  const [issues, setIssues] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ target: '', type: 'breakdown', comment: '' });
  const [issueError, setIssueError] = useState('');
  const [issueSaving, setIssueSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [inventoryRes, issuesRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/issues'),
      ]);
      setData(inventoryRes.data || { branches: [], units: [], balances: [] });
      setIssues(issuesRes.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Не удалось загрузить имущество');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const query = search.trim().toLowerCase();

  const units = useMemo(
    () =>
      (data.units || []).filter((unit) => {
        if (branchId && unit.branchId !== branchId) return false;
        if (!query) return true;
        return [unit.item?.name, unit.inventoryNumber, unit.location]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }),
    [data.units, branchId, query]
  );

  const balances = useMemo(
    () =>
      (data.balances || []).filter((balance) => {
        if (branchId && balance.branchId !== branchId) return false;
        if (!query) return true;
        return [balance.item?.name, balance.branch?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      }),
    [data.balances, branchId, query]
  );

  // Варианты для заявки: экземпляры и расходники
  const issueOptions = useMemo(() => {
    const options = [];
    units.forEach((unit) => {
      options.push({
        value: `unit:${unit.id}`,
        label: `${unit.item?.name || 'Оборудование'} — ${unit.inventoryNumber}`,
      });
    });
    balances.forEach((balance) => {
      options.push({
        value: `item:${balance.itemId}:${balance.branchId || ''}`,
        label: `${balance.item?.name || 'Расходник'} (${balance.branch?.name || 'филиал'})`,
      });
    });
    return options;
  }, [units, balances]);

  const openIssueModal = () => {
    setIssueForm({ target: '', type: 'breakdown', comment: '' });
    setIssueError('');
    setIssueOpen(true);
  };

  const submitIssue = async () => {
    const comment = issueForm.comment.trim();
    if (!comment) {
      setIssueError('Опишите проблему');
      return;
    }

    setIssueSaving(true);
    setIssueError('');
    try {
      const [kind, id, targetBranchId] = issueForm.target
        ? issueForm.target.split(':')
        : [];
      const payload = { type: issueForm.type, comment };
      if (kind === 'unit') payload.unitId = id;
      if (kind === 'item') {
        payload.itemId = id;
        payload.branchId = targetBranchId || branchId || undefined;
      }
      if (!payload.branchId && !payload.unitId) {
        const fallback = branchId || data.branches[0]?.id;
        if (fallback) payload.branchId = fallback;
      }
      await api.post('/inventory/issues', payload);
      setIssueOpen(false);
      await load();
    } catch (e) {
      setIssueError(e.response?.data?.message || 'Не удалось отправить заявку');
    } finally {
      setIssueSaving(false);
    }
  };

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <h1 style={{ marginTop: 0 }}>Имущество</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginTop: 0 }}>
        Имущество филиалов, где вы ведёте группы. Если что-то сломалось или
        закончилось — сообщите администратору.
      </p>

      <button
        type="button"
        onClick={openIssueModal}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          border: 'none',
          background: '#2563eb',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 14,
        }}
      >
        ⚠️ Сообщить о проблеме
      </button>

      {data.branches.length > 1 && (
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            marginBottom: 10,
            background: '#fff',
          }}
        >
          <option value="">Все мои филиалы</option>
          {data.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию или номеру"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #cbd5e1',
          marginBottom: 14,
        }}
      />

      {loading && <div style={{ color: '#64748b' }}>Загрузка...</div>}
      {error && <div style={{ color: '#b91c1c' }}>⚠️ {error}</div>}

      {!loading && !error && (
        <>
          <h3>Оборудование · {units.length}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {units.length === 0 && (
              <Card style={{ padding: 14, color: '#64748b' }}>Оборудования пока нет</Card>
            )}
            {units.map((unit) => (
              <Card key={unit.id} style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{unit.item?.name || 'Без названия'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {[
                    unit.inventoryNumber,
                    unit.branch?.name,
                    unit.location,
                    STATUS_LABELS[unit.status] || unit.status,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </Card>
            ))}
          </div>

          <h3 style={{ marginTop: 20 }}>Расходники · {balances.length}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {balances.length === 0 && (
              <Card style={{ padding: 14, color: '#64748b' }}>Расходников пока нет</Card>
            )}
            {balances.map((balance) => (
              <Card key={balance.id} style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{balance.item?.name || 'Без названия'}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {balance.branch?.name} · остаток: {balance.quantity} {balance.item?.unit || 'шт'}
                  {balance.isLowStock ? ' · заканчивается' : ''}
                </div>
              </Card>
            ))}
          </div>

          <h3 style={{ marginTop: 20 }}>Мои заявки · {issues.length}</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {issues.length === 0 && (
              <Card style={{ padding: 14, color: '#64748b' }}>Заявок пока нет</Card>
            )}
            {issues.map((issue) => (
              <Card key={issue.id} style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>
                  {TYPE_LABELS[issue.type] || issue.type} ·{' '}
                  <span style={{ fontWeight: 500, color: '#64748b', fontSize: 12 }}>
                    {ISSUE_STATUS_LABELS[issue.status] || issue.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{issue.comment}</div>
                {issue.resolutionComment && (
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
                    Ответ администратора: {issue.resolutionComment}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {issueOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !issueSaving && setIssueOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: '16px 16px 0 0',
              padding: 20,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Сообщить о проблеме</h3>

            {issueError && (
              <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 8 }}>
                ⚠️ {issueError}
              </div>
            )}

            <select
              value={issueForm.type}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, type: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                marginBottom: 10,
                background: '#fff',
              }}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={issueForm.target}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, target: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                marginBottom: 10,
                background: '#fff',
              }}
            >
              <option value="">Без привязки к имуществу</option>
              {issueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <textarea
              value={issueForm.comment}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Что случилось или чего не хватает"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 90,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                marginBottom: 12,
                fontFamily: 'inherit',
                fontSize: 14,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                disabled={issueSaving}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={submitIssue}
                disabled={issueSaving}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: issueSaving ? 0.7 : 1,
                }}
              >
                {issueSaving ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
        {user?.name ? `${user.name} · ` : ''}данные обновляются при открытии страницы
      </div>
    </div>
  );
};

export default InventoryPage;
