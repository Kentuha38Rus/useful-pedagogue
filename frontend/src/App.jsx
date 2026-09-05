import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { loadUser } from './store/slices/authSlice';
import { initSocket } from './store/slices/chatSlice';
import { requestNotificationPermission } from './utils/notifications';

import BottomNav from './components/navigation/BottomNav';
import Header from './components/navigation/Header';
import LandingPage from './pages/Landing/LandingPage';
import HomePage from './pages/Home/HomePage';
import CoursesPage from './pages/Courses/CoursesPage';
import ChatsPage from './pages/Chats/ChatsPage';
import SchedulePage from './pages/Schedule/SchedulePage';
import ProfilePage from './pages/Profile/ProfilePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import PrivateRoute from './components/common/PrivateRoute';

import './App.scss';

function App() {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    // Не вызываем loadUser на страницах авторизации и на лендинге
    if (!['/login', '/register', '/'].includes(location.pathname)) {
      dispatch(loadUser());
      dispatch(initSocket());
      requestNotificationPermission();
    }
  }, [dispatch, location.pathname]);

  // Показываем навигацию только в защищённой части (начинается с /app)
  const showNav = location.pathname.startsWith('/app');

  return (
    <div className="app">
      {showNav && <Header />}
      <main className="app-main">
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Защищённые маршруты (личный кабинет) */}
          <Route path="/app" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/app/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
          <Route path="/app/chats" element={<PrivateRoute><ChatsPage /></PrivateRoute>} />
          <Route path="/app/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
          <Route path="/app/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}

export default App;