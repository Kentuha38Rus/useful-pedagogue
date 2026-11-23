import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, updateUserRole, createUser, deleteUser } from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const UsersPage = () => {
  const dispatch = useDispatch();
  const { users, loading } = useSelector((state) => state.admin);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

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

  const handleRoleChange = (userId, newRole) => {
    dispatch(updateUserRole({ userId, role: newRole }));
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Вы уверены, что хотите удалить пользователя "${userName}" и всех его детей?`)) {
      dispatch(deleteUser(userId));
    }
  };

  const nextPage = () => {
    if (page < users.totalPages) setPage(page + 1);
  };
  const prevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Дополнительная проверка на клиенте
    if (newUser.username.length < 3) {
      setFormError('Логин должен быть не менее 3 символов');
      return;
    }

    try {
      await dispatch(createUser(newUser)).unwrap();
      setShowCreateUser(false);
      setNewUser({ username: '', email: '', password: '', name: '', phone: '', role: 'teacher' });
      dispatch(fetchUsers({ page, role: roleFilter, search }));
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Ошибка при создании пользователя');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Пользователи</h1>
        <Button onClick={() => setShowCreateUser(true)}>+ Создать пользователя</Button>
      </div>

      {showCreateUser && (
        <Card style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
          <h3>Создать пользователя</h3>
          <form onSubmit={handleCreateUser}>
            <div style={{ marginBottom: '10px' }}>
              <label>Роль</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
              >
                <option value="teacher">Преподаватель</option>
                <option value="parent">Родитель</option>
                <option value="admin">Администратор</option>
              </select>
            </div>

            <Input
              placeholder="Логин (от 3 символов)"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              minLength={3}
              maxLength={50}
              required
            />
            <Input
              placeholder="Email (необязательно)"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <Input
              placeholder="Пароль"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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

            {formError && <div style={{ color: 'red', marginBottom: '10px' }}>{formError}</div>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button type="submit">Сохранить</Button>
              <Button variant="default" onClick={() => setShowCreateUser(false)}>Отмена</Button>
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
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '8px' }}>
          <option value="">Все роли</option>
          <option value="admin">Админ</option>
          <option value="teacher">Учитель</option>
          <option value="parent">Родитель</option>
        </select>
      </div>

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr style={{ background: '#f0f2f5' }}>
                  <th>Имя</th>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Телефон</th>
                  <th>Детей</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td data-label="Имя">{user.name}</td>
                    <td data-label="Логин">{user.username}</td>
                    <td data-label="Email">{user.email || '-'}</td>
                    <td data-label="Роль">{user.role}</td>
                    <td data-label="Телефон">{user.phone || '-'}</td>
                    <td data-label="Детей">{user.children?.length || 0}</td>
                    <td className="cell-actions" data-label="Действия">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        style={{ padding: '4px', marginRight: '8px' }}
                      >
                        <option value="admin">Админ</option>
                        <option value="teacher">Учитель</option>
                        <option value="parent">Родитель</option>
                      </select>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                      >
                        Удалить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <Button onClick={prevPage} disabled={page === 1}>Назад</Button>
            <span>Страница {page} из {users.totalPages}</span>
            <Button onClick={nextPage} disabled={page === users.totalPages}>Вперёд</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default UsersPage;