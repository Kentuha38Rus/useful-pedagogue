import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { loadUser } from './store/slices/authSlice';
import { initSocket, fetchDialogs } from './store/slices/chatSlice';

import BottomNav from './components/navigation/BottomNav';
import Header from './components/navigation/Header';
import HomePage from './pages/Home/HomePage';
import CoursesPage from './pages/Courses/CoursesPage';
import ChatsPage from './pages/Chats/ChatsPage';
import SchedulePage from './pages/Schedule/SchedulePage';
import ProfilePage from './pages/Profile/ProfilePage';
import LoginPage from './pages/Auth/LoginPage';
import PrivateRoute from './components/common/PrivateRoute';
import TeacherGroupsPage from './pages/Teacher/TeacherGroupsPage';
import PlatformPage from './pages/Platform/PlatformPage';

import './App.scss';

// Только логин публичный. Корень теперь редиректит.
const PUBLIC_PATHS = ['/login'];

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  // ИСПРАВЛЕНО: Добавлен loading в useSelector
  const { user, impersonation, isAuthenticated, loading } = useSelector((s) => s.auth);

  const isPublic = PUBLIC_PATHS.includes(location.pathname);

  useEffect(() => {
    if (!isPublic && !user) {
      dispatch(loadUser());
    }
  }, [dispatch, isPublic, user]);

  useEffect(() => {
    if (user?.id && user?.role !== 'platform_admin') {
      dispatch(initSocket());
      dispatch(fetchDialogs());
    }
  }, [dispatch, user?.id, user?.role]);

  // ИСПРАВЛЕНО: Глобальный экран загрузки, чтобы избежать мигания страницы логина
  if (loading && !isPublic) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontSize: '18px', color: '#666' }}>
        Загрузка...
      </div>
    );
  }

  // 1) Публичные страницы (только логин)
  if (isPublic) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 2) platform_admin не должен попадать в /app
  const isPlatform = location.pathname.startsWith('/platform');
  if (isAuthenticated && user?.role === 'platform_admin' && !isPlatform) {
    return <Navigate to="/platform" replace />;
  }

  // 3) Платформенная админка
  if (isPlatform) {
    return (
      <Routes>
        <Route
          path="/platform"
          element={
            <PrivateRoute role="platform_admin">
              <PlatformPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/platform" replace />} />
      </Routes>
    );
  }

  // 4) Защищённая зона /app/*
  const appClass = impersonation ? 'app app--impersonation' : 'app';

  return (
    <div className={appClass}>
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/app" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/app/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
          <Route path="/app/chats/*" element={<PrivateRoute><ChatsPage /></PrivateRoute>} />
          <Route path="/app/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
          <Route path="/app/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/app/teacher/groups" element={<PrivateRoute><TeacherGroupsPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/app" : "/login"} replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default App;