import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { markAllAsRead } from '../../store/slices/chatSlice';
import styles from './BottomNav.module.scss';

const BottomNav = () => {
  const dispatch = useDispatch();
  const handleChatClick = () => {
    dispatch(markAllAsRead());
  };

  return (
    <nav className={styles.bottomNav}>
      <NavLink to="/app" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} end>
        <span className={styles.icon}>🏠</span>
        <span className={styles.label}>Главная</span>
      </NavLink>
      <NavLink to="/app/courses" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}>📚</span>
        <span className={styles.label}>Курсы</span>
      </NavLink>
      <NavLink to="/app/chats" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`} onClick={handleChatClick}>
        <span className={styles.icon}>💬</span>
        <span className={styles.label}>Чаты</span>
        <span className={styles.badge}>3</span> {/* пример */}
      </NavLink>
      <NavLink to="/app/schedule" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}>📅</span>
        <span className={styles.label}>Расписание</span>
      </NavLink>
      <NavLink to="/app/profile" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}>👤</span>
        <span className={styles.label}>Профиль</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;