import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateUser, deleteUser } from '../../store/slices/adminSlice';
import Button from '../common/Button';
import Input from '../common/Input';

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 1100,
};

const card = {
  width: '100%',
  maxWidth: 520,
  maxHeight: '92vh',
  overflowY: 'auto',
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.35)',
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
  color: '#334155',
};

const UserEditModal = ({ user, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'teacher',
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const username = form.username.trim();

    if (!name) {
      setError('Имя не может быть пустым');
      return;
    }
    if (username.length < 3) {
      setError('Логин должен быть не менее 3 символов');
      return;
    }

    const payload = {
      name,
      username,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
    };
    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      await dispatch(updateUser({ id: user.id, ...payload })).unwrap();
      onSaved();
    } catch (err) {
      setError(
        typeof err === 'string' ? err : 'Не удалось сохранить пользователя'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Удалить пользователя "${user.name}"? Это действие необратимо.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await dispatch(deleteUser(user.id)).unwrap();
      onSaved();
    } catch (err) {
      setError(
        typeof err === 'string' ? err : 'Не удалось удалить пользователя'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <h3 style={{ margin: 0 }}>Редактировать пользователя</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
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

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Имя</label>
          <Input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
          />

          <label style={labelStyle}>Логин</label>
          <Input
            value={form.username}
            onChange={(e) => setField('username', e.target.value)}
            minLength={3}
            maxLength={50}
            required
          />

          <label style={labelStyle}>Email</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="Можно оставить пустым"
          />

          <label style={labelStyle}>Телефон</label>
          <Input
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="Можно оставить пустым"
          />

          <label style={labelStyle}>Роль</label>
          <select
            value={form.role}
            onChange={(e) => setField('role', e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              marginBottom: 10,
              border: '1px solid #ccc',
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            <option value="teacher">Преподаватель</option>
            <option value="parent">Родитель</option>
            <option value="admin">Администратор</option>
          </select>

          <label style={labelStyle}>Новый пароль</label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            placeholder="Оставьте пустым, чтобы не менять"
          />

          {error && (
            <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginTop: 8,
            }}
          >
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={saving || deleting}
            >
              {deleting ? 'Удаление...' : 'Удалить пользователя'}
            </Button>

            <div style={{ display: 'flex', gap: 10 }}>
              <Button type="button" variant="default" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving || deleting}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
