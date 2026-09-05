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

  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    phone: '',
  });

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

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    await dispatch(createUser({ ...newTeacher, role: 'teacher' }));
    setShowCreateTeacher(false);
    setNewTeacher({ username: '', email: '', password: '', name: '', phone: '' });
    dispatch(fetchUsers({ page, role: roleFilter, search }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Пользователи</h1>
        <Button onClick={() => setShowCreateTeacher(true)}>+ Создать преподавателя</Button>
      </div>

      {showCreateTeacher && (
        <Card style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
          <h3>Создать преподавателя</h3>
          <form onSubmit={handleCreateTeacher}>
            <Input
              placeholder="Логин"
              value={newTeacher.username}
              onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
              required
            />
            <Input
              placeholder="Email (необязательно)"
              type="email"
              value={newTeacher.email}
              onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
            />
            <Input
              placeholder="Пароль"
              type="password"
              value={newTeacher.password}
              onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
              required
            />
            <Input
              placeholder="Полное имя"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
              required
            />
            <Input
              placeholder="Телефон (необязательно)"
              value={newTeacher.phone}
              onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button type="submit">Сохранить</Button>
              <Button variant="default" onClick={() => setShowCreateTeacher(false)}>Отмена</Button>
            </div>
          </form>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
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
                  <td>{user.name}</td>
                  <td>{user.username}</td>
                  <td>{user.email || '-'}</td>
                  <td>{user.role}</td>
                  <td>{user.phone || '-'}</td>
                  <td>{user.children?.length || 0}</td>
                  <td>
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
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
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