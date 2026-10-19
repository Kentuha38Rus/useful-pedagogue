import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './BottomNav.module.scss';

const BottomNav = () => {
  const { user } = useSelector((state) => state.auth);
  const unreadTotal = useSelector((state) => state.chat.unreadTotal);

  // Общее число непрочитанных сообщений (не диалогов)
  const chatBadge = unreadTotal > 99 ? '99+' : unreadTotal;

  let navItems = [];
  if (user?.role === 'teacher') {
    navItems = [
      { to: '/app', label: 'Главная', icon: '🏠', end: true },
      { to: '/app/teacher/groups', label: 'Группы', icon: '👥' },
      { to: '/app/chats', label: 'Чаты', icon: '💬', badge: chatBadge },
      { to: '/app/profile', label: 'Профиль', icon: '👤' },
    ];
  } else {
    navItems = [
      { to: '/app', label: 'Главная', icon: '🏠', end: true },
      { to: '/app/courses', label: 'Курсы', icon: '📚' },
      { to: '/app/chats', label: 'Чаты', icon: '💬', badge: chatBadge },
      { to: '/app/schedule', label: 'Расписание', icon: '📅' },
      { to: '/app/profile', label: 'Профиль', icon: '👤' },
    ];
  }

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.active : ''}`
          }
          end={item.end}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
          {item.badge > 0 && <span className={styles.badge}>{item.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;