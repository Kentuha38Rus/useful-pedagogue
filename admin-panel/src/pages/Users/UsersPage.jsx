import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, createUser } from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import UserEditModal from '../../components/users/UserEditModal';

const roleLabel = (role) => {
  switch (role) {
    case 'admin':
      return 'Администратор';
    case 'teacher':
      return 'Преподаватель';
    case 'parent':
      return 'Родитель';
    default:
      return role || '';
  }
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '5px 0',
  fontSize: 13,
  borderBottom: '1px solid #f8fafc',
};

const detailLabel = {
  color: '#64748b',
  flexShrink: 0,
};

const UsersPage = () => {
  const dispatch = useDispatch();
  const { users, loading } = useSelector((state) => state.admin);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'teacher',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchUsers({ page, role: roleFilter, search }));
  }, [dispatch, page, roleFilter, search]);

  useEffect(() => {
    if (users.totalPages > 0 && page > users.totalPages) {
      setPage(users.totalPages);
    }
  }, [users.totalPages, page]);

  const nextPage = () => {
    if (page < users.totalPages) setPage(page + 1);
  };
  const prevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (newUser.username.length < 3) {
      setFormError('Логин должен быть не менее 3 символов');
      return;
    }

    try {
      await dispatch(createUser(newUser)).unwrap();
      setShowCreateUser(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'teacher',
      });
      dispatch(fetchUsers({ page, role: roleFilter, search }));
    } catch (err) {
      setFormError(
        typeof err === 'string' ? err : 'Ошибка при создании пользователя'
      );
    }
  };

  const handleSaved = () => {
    setEditingUser(null);
    setExpandedId(null);
    dispatch(fetchUsers({ page, role: roleFilter, search }));
  };

  return (
    <div>
      <div className="page-head">
        <h1>Пользователи</h1>
        <Button onClick={() => setShowCreateUser(true)}>
          + Создать пользователя
        </Button>
      </div>

      {showCreateUser && (
        <Card
          style={{
            marginBottom: '20px',
            padding: '20px',
            border: '1px solid #ccc',
          }}
        >
          <h3>Создать пользователя</h3>
          <form onSubmit={handleCreateUser}>
            <div style={{ marginBottom: '10px' }}>
              <label>Роль</label>
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                }}
              >
                <option value="teacher">Преподаватель</option>
                <option value="parent">Родитель</option>
                <option value="admin">Администратор</option>
              </select>
            </div>

            <Input
              placeholder="Логин (от 3 символов)"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
              minLength={3}
              maxLength={50}
              required
            />
            <Input
              placeholder="Email (необязательно)"
              type="email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />
            <Input
              placeholder="Пароль"
              type="password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              required
            />
            <Input
              placeholder="Полное имя"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
            />
            <Input
              placeholder="Телефон (необязательно)"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
            />

            {formError && (
              <div style={{ color: 'red', marginBottom: '10px' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button type="submit">Сохранить</Button>
              <Button
                variant="default"
                onClick={() => setShowCreateUser(false)}
              >
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="filters">
        <input
          type="text"
          placeholder="Поиск по имени, логину или email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px', flex: '1' }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: '8px' }}
        >
          <option value="">Все роли</option>
          <option value="admin">Админ</option>
          <option value="teacher">Преподаватель</option>
          <option value="parent">Родитель</option>
        </select>
      </div>

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <>
          {(!users.users || users.users.length === 0) && (
            <Card style={{ padding: 20, marginBottom: 12 }}>
              Пользователи не найдены
            </Card>
          )}

          {(users.users || []).map((user) => {
            const isExpanded = expandedId === user.id;
            const children = user.children || [];
            const createdAt = user.createdAt
              ? new Date(user.createdAt).toLocaleDateString('ru-RU')
              : '—';

            return (
              <Card
                key={user.id}
                style={{
                  marginBottom: 10,
                  padding: 0,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : user.id)
                  }
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {user.name || 'Без имени'}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {roleLabel(user.role)}
                      {user.username ? ` · ${user.username}` : ''}
                      {user.email ? ` · ${user.email}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: '#64748b' }}>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </button>

                {isExpanded && (
                  <div
                    style={{
                      padding: '0 16px 16px',
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={detailRow}>
                      <span style={detailLabel}>Логин</span>
                      <span>{user.username || '—'}</span>
                    </div>
                    <div style={detailRow}>
                      <span style={detailLabel}>Email</span>
                      <span>{user.email || '—'}</span>
                    </div>
                    <div style={detailRow}>
                      <span style={detailLabel}>Телефон</span>
                      <span>{user.phone || '—'}</span>
                    </div>
                    <div style={detailRow}>
                      <span style={detailLabel}>Роль</span>
                      <span>{roleLabel(user.role)}</span>
                    </div>
                    <div style={detailRow}>
                      <span style={detailLabel}>Детей</span>
                      <span>{children.length}</span>
                    </div>
                    <div style={detailRow}>
                      <span style={detailLabel}>Создан</span>
                      <span>{createdAt}</span>
                    </div>

                    {children.length > 0 && (
                      <div
                        style={{
                          fontSize: 13,
                          color: '#334155',
                          marginTop: 8,
                          lineHeight: 1.45,
                        }}
                      >
                        <span style={{ color: '#64748b' }}>Дети: </span>
                        {children
                          .map((child) => child.name)
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <Button onClick={() => setEditingUser(user)}>
                        Редактировать
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          <div className="pager">
            <Button onClick={prevPage} disabled={page === 1}>
              Назад
            </Button>
            <span>
              Страница {page} из {users.totalPages || 1}
            </span>
            <Button
              onClick={nextPage}
              disabled={page === (users.totalPages || 1)}
            >
              Вперёд
            </Button>
          </div>
        </>
      )}

      {editingUser && (
        <UserEditModal
          key={editingUser.id}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};

export default UsersPage;
