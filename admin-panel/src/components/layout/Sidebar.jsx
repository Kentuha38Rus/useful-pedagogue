import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import Button from '../common/Button';

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Дашборд' },
    { to: '/users', label: 'Пользователи' },
    { to: '/groups', label: 'Группы' },
    { to: '/courses', label: 'Курсы' },
    { to: '/payments', label: 'Платежи' },
  ];

  return (
    <div style={{
      width: '240px',
      backgroundColor: '#2c3e50',
      color: 'white',
      minHeight: '100vh',
      padding: '20px 0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Admin</h2>
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '12px 20px',
              color: 'white',
              textDecoration: 'none',
              backgroundColor: isActive ? '#34495e' : 'transparent',
              borderLeft: isActive ? '4px solid #4A90E2' : 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '20px' }}>
        <Button variant="danger" onClick={handleLogout} style={{ width: '100%' }}>
          Выйти
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;