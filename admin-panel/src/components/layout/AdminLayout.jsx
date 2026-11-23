import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

// Заголовок в мобильной шапке — по адресу страницы
const TITLES = {
  '/': 'Дашборд',
  '/users': 'Пользователи',
  '/groups': 'Группы',
  '/courses': 'Курсы',
  '/payments': 'Платежи',
  '/salary': 'Зарплата',
  '/chats': 'Чаты',
};

const getTitle = (pathname) => {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/chats')) return 'Чаты';
  return 'Админ-панель';
};

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // При переходе на другой раздел меню на телефоне закрывается
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Закрытие меню клавишей Esc
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="admin-shell">
      <header className="mobile-bar">
        <button
          type="button"
          className="mobile-bar__menu"
          aria-label="Открыть меню"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
        <div className="mobile-bar__title">{getTitle(location.pathname)}</div>
      </header>

      <Sidebar isOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />

      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="admin-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
