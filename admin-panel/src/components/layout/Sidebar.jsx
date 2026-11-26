import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { subscribeAdminPush } from '../../utils/push';
import Button from '../common/Button';

const Sidebar = ({ isOpen = false, onNavigate }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const unreadTotal = useSelector((state) => state.chat?.unreadTotal || 0);
  const [pushState, setPushState] = useState({ loading: false, message: '' });

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleEnablePush = async () => {
    setPushState({ loading: true, message: '' });
    try {
      const result = await subscribeAdminPush();
      let message = 'Уведомления включены';
      if (!result.ok) {
        if (result.reason === 'permission') {
          message = 'Разрешение на уведомления не выдано';
        } else if (result.reason === 'no-vapid-key') {
          message = 'Не настроен ключ VAPID для push';
        } else if (result.reason === 'unsupported') {
          message = 'Браузер не поддерживает push';
        } else {
          message = 'Не удалось включить уведомления';
        }
      }
      setPushState({ loading: false, message });
    } catch (_) {
      setPushState({ loading: false, message: 'Ошибка включения уведомлений' });
    }
  };

  const navItems = [
    { to: '/', label: 'Дашборд' },
    { to: '/users', label: 'Пользователи' },
    { to: '/groups', label: 'Группы' },
    { to: '/courses', label: 'Курсы' },
    { to: '/payments', label: 'Платежи' },
    { to: '/salary', label: '💰 Зарплата' },
    { to: '/chats', label: '💬 Чаты', badge: unreadTotal },
  ];

  return (
    <div
      className={`admin-sidebar${isOpen ? ' is-open' : ''}`}
      style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Admin</h2>
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            style={({ isActive }) => ({
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              color: 'white',
              textDecoration: 'none',
              backgroundColor: isActive ? '#34495e' : 'transparent',
              borderLeft: isActive ? '4px solid #4A90E2' : '4px solid transparent',
            })}
          >
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '0 20px 12px' }}>
        <Button
          variant="primary"
          onClick={handleEnablePush}
          disabled={pushState.loading}
          style={{ width: '100%' }}
        >
          {pushState.loading ? 'Включаем...' : '🔔 Включить уведомления'}
        </Button>
        {pushState.message && (
          <div
            style={{
              fontSize: 11,
              color: '#cbd5e1',
              marginTop: 6,
              lineHeight: 1.3,
            }}
          >
            {pushState.message}
          </div>
        )}
      </div>
      <div style={{ padding: '20px' }}>
        <Button variant="danger" onClick={handleLogout} style={{ width: '100%' }}>
          Выйти
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;