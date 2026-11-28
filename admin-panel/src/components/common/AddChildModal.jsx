import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailableChildren, addChildToGroup } from '../../store/slices/adminSlice';
import Button from './Button';
import Card from './Card';

const childLabel = (child) =>
  [child?.surname, child?.name].filter(Boolean).join(' ') ||
  child?.name ||
  'Без имени';

const AddChildModal = ({ isOpen, onClose, groupId, onChildAdded }) => {
  const dispatch = useDispatch();
  const { availableChildren, loading } = useSelector((state) => state.admin);

  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [failed, setFailed] = useState([]);

  // Дети, которых ещё нет в этой группе
  const childrenNotInGroup = useMemo(() => {
    return (availableChildren || []).filter((child) => {
      if (!child.groups) return true;
      return !child.groups.some((g) => String(g.id) === String(groupId));
    });
  }, [availableChildren, groupId]);

  const visibleChildren = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return childrenNotInGroup;
    return childrenNotInGroup.filter((child) => {
      const haystack = [
        child.name,
        child.surname,
        child.parent?.name,
        child.parent?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [childrenNotInGroup, search]);

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchAvailableChildren());
    setSelectedIds([]);
    setSearch('');
    setBusy(false);
    setError(null);
    setFailed([]);
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  const toggleChild = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    visibleChildren.length > 0 &&
    visibleChildren.every((child) => selectedIds.includes(child.id));

  const toggleAllVisible = () => {
    const visibleIds = visibleChildren.map((child) => child.id);
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      const merged = new Set([...prev, ...visibleIds]);
      return Array.from(merged);
    });
  };

  const handleAdd = async () => {
    if (!selectedIds.length) {
      setError('Выберите хотя бы одного ребёнка');
      return;
    }

    setBusy(true);
    setError(null);
    setFailed([]);

    let added = 0;
    const failedItems = [];

    // Добавляем по одному: сервер проверяет лимит группы и конфликты расписания.
    for (const childId of selectedIds) {
      try {
        await dispatch(addChildToGroup({ childId, groupId })).unwrap();
        added += 1;
      } catch (err) {
        const child = childrenNotInGroup.find((item) => item.id === childId);
        failedItems.push({
          id: childId,
          name: childLabel(child),
          message:
            typeof err === 'string'
              ? err
              : err?.message || 'Не удалось добавить',
        });
      }
    }

    setBusy(false);

    if (added > 0) {
      onChildAdded?.();
      dispatch(fetchAvailableChildren());
    }

    if (!failedItems.length) {
      onClose();
      return;
    }

    setFailed(failedItems);
    setSelectedIds(failedItems.map((item) => item.id));
    setError(
      `Добавлено: ${added}. Не удалось: ${failedItems.length}. ` +
        'Причины — под списком.'
    );
  };

  return (
    <div style={styles.overlay} onClick={busy ? undefined : onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <Card className="modal-card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Добавить детей в группу</h3>

          <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
            Отметьте одного или нескольких детей — они добавятся за один раз.
          </p>

          {error && (
            <p style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>
          )}

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени ребёнка или родителя"
            style={styles.search}
            disabled={busy}
          />

          <div style={styles.listHeader}>
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={busy || visibleChildren.length === 0}
              style={styles.linkButton}
            >
              {allVisibleSelected ? 'Снять выделение' : 'Выбрать всех'}
            </button>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Выбрано: {selectedIds.length}
            </span>
          </div>

          <div style={styles.list}>
            {loading && (
              <div style={{ padding: 12, color: '#64748b' }}>Загрузка...</div>
            )}

            {!loading && visibleChildren.length === 0 && (
              <div style={{ padding: 12, color: '#64748b', fontSize: 14 }}>
                {childrenNotInGroup.length === 0
                  ? 'Нет детей, которых можно добавить в эту группу'
                  : 'Никого не найдено по запросу'}
              </div>
            )}

            {!loading &&
              visibleChildren.map((child) => (
                <label key={child.id} style={styles.row}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(child.id)}
                    onChange={() => toggleChild(child.id)}
                    disabled={busy}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={styles.rowName}>{childLabel(child)}</span>
                    {child.parent?.name && (
                      <span style={styles.rowHint}>
                        родитель: {child.parent.name}
                      </span>
                    )}
                  </span>
                </label>
              ))}
          </div>

          {failed.length > 0 && (
            <ul style={styles.failedList}>
              {failed.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>: {item.message}
                </li>
              ))}
            </ul>
          )}

          <div style={styles.footer}>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Отмена
            </Button>
            <Button onClick={handleAdd} disabled={busy || !selectedIds.length}>
              {busy
                ? 'Добавляем...'
                : `Добавить${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    zIndex: 999,
  },
  modal: {
    background: 'white',
    borderRadius: '8px',
    padding: '0',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  search: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '10px 0 6px',
  },
  linkButton: {
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    cursor: 'pointer',
    padding: 0,
    fontSize: 13,
    textDecoration: 'underline',
  },
  list: {
    maxHeight: 280,
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    fontSize: 14,
  },
  rowName: {
    display: 'block',
    fontWeight: 600,
  },
  rowHint: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
  },
  failedList: {
    margin: '10px 0 0',
    paddingLeft: 18,
    color: '#b91c1c',
    fontSize: 12,
    maxHeight: 120,
    overflowY: 'auto',
  },
  footer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
};

export default AddChildModal;
