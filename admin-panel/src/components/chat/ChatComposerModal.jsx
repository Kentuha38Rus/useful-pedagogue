import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Button from '../common/Button';

const roleLabel = (role) => {
  if (role === 'teacher') return 'преподаватель';
  if (role === 'parent') return 'родитель';
  return role || '';
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.35)',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  list: {
    maxHeight: 220,
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    marginTop: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: 14,
    cursor: 'pointer',
  },
  muted: { color: '#64748b', fontSize: 12 },
};

const ChatComposerModal = ({
  isOpen,
  mode,
  onClose,
  onOpenDialog,
  onBroadcastDone,
}) => {
  const isDialog = mode === 'dialog';
  const [role, setRole] = useState('teacher');
  const [sendAll, setSendAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelectedIds([]);
    setContent('');
    setError('');
    setSendAll(true);
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          limit: 200,
          search: search.trim() || undefined,
        };
        let list = [];

        if (isDialog) {
          const [teachersRes, parentsRes] = await Promise.all([
            api.get('/admin/users', {
              params: { ...params, role: 'teacher' },
            }),
            api.get('/admin/users', {
              params: { ...params, role: 'parent' },
            }),
          ]);
          list = [
            ...(teachersRes.data.users || []),
            ...(parentsRes.data.users || []),
          ];
        } else {
          const res = await api.get('/admin/users', {
            params: { ...params, role },
          });
          list = res.data.users || [];
        }

        if (!cancelled) {
          list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
          setUsers(list);
        }
      } catch (_) {
        if (!cancelled) setError('Не удалось загрузить пользователей');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, isDialog, role, search]);

  if (!isOpen) return null;

  const toggleUser = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBroadcast = async () => {
    const text = content.trim();
    if (!text) {
      setError('Введите текст рассылки');
      return;
    }
    if (!sendAll && selectedIds.length === 0) {
      setError('Выберите хотя бы одного получателя');
      return;
    }

    setSending(true);
    setError('');
    try {
      const res = await api.post('/admin/chats/broadcast', {
        role,
        userIds: sendAll ? [] : selectedIds,
        content: text,
      });
      onBroadcastDone?.(res.data?.message || 'Рассылка отправлена');
      onClose();
    } catch (e) {
      setError(
        e.response?.data?.error ||
          e.response?.data?.message ||
          'Не удалось отправить рассылку'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>
            {isDialog ? 'Новый диалог' : 'Массовая рассылка'}
          </h3>
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
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {!isDialog && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Button
              type="button"
              variant={role === 'teacher' ? 'primary' : 'default'}
              onClick={() => {
                setRole('teacher');
                setSelectedIds([]);
              }}
            >
              Преподавателям
            </Button>
            <Button
              type="button"
              variant={role === 'parent' ? 'primary' : 'default'}
              onClick={() => {
                setRole('parent');
                setSelectedIds([]);
              }}
            >
              Родителям
            </Button>
          </div>
        )}

        {isDialog && (
          <div style={{ ...modalStyles.muted, marginBottom: 8 }}>
            Выберите родителя или преподавателя — откроется личный диалог.
          </div>
        )}

        {!isDialog && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="radio"
                checked={sendAll}
                onChange={() => setSendAll(true)}
              />
              Всем
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="radio"
                checked={!sendAll}
                onChange={() => setSendAll(false)}
              />
              Выбрать конкретных
            </label>
          </div>
        )}

        <input
          style={modalStyles.input}
          placeholder="Поиск по имени, логину или email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && (
          <div style={{ ...modalStyles.muted, padding: 10 }}>Загрузка...</div>
        )}

        {!loading && (
          <div style={modalStyles.list}>
            {users.length === 0 && (
              <div style={{ ...modalStyles.muted, padding: 10 }}>
                Пользователи не найдены
              </div>
            )}
            {users.map((user) => (
              <div
                key={user.id}
                style={modalStyles.row}
                onClick={() => {
                  if (isDialog) onOpenDialog(user);
                  else if (!sendAll) toggleUser(user.id);
                }}
              >
                {!isDialog && !sendAll && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {user.name || user.username || 'Без имени'}
                  </div>
                  <div style={modalStyles.muted}>
                    {roleLabel(user.role)}
                    {user.username ? ` · ${user.username}` : ''}
                    {user.email ? ` · ${user.email}` : ''}
                  </div>
                </div>
                {isDialog && <span style={{ color: '#2563eb' }}>Открыть</span>}
              </div>
            ))}
          </div>
        )}

        {!isDialog && (
          <>
            <div style={{ ...modalStyles.muted, marginTop: 8 }}>
              {sendAll
                ? `Получателей: ${users.length} (все ${role === 'teacher' ? 'преподаватели' : 'родители'})`
                : `Выбрано: ${selectedIds.length} из ${users.length}`}
            </div>
            <textarea
              style={{
                ...modalStyles.input,
                minHeight: 90,
                marginTop: 10,
                resize: 'vertical',
              }}
              placeholder="Текст рассылки"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </>
        )}

        {error && (
          <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 8 }}>
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 14,
          }}
        >
          <Button type="button" variant="default" onClick={onClose}>
            Отмена
          </Button>
          {!isDialog && (
            <Button
              type="button"
              variant="primary"
              onClick={handleBroadcast}
              disabled={sending}
            >
              {sending ? 'Отправка...' : 'Отправить'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatComposerModal;
