import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { loadUser } from './store/slices/authSlice';
import { initSocket, fetchDialogs } from './store/slices/chatSlice';

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
import TeacherGroupsPage from './pages/Teacher/TeacherGroupsPage';

import './App.scss';

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!['/login', '/register', '/'].includes(location.pathname)) {
      dispatch(loadUser());
    }
  }, [dispatch, location.pathname]);

  useEffect(() => {
    if (user?.id) {
      dispatch(initSocket());
      dispatch(fetchDialogs());
    }
  }, [dispatch, user?.id]);

  // Публичные страницы (лендинг, login, register) — рендерим БЕЗ .app-обёртки,
  // чтобы работал window.scroll и react-scroll на лендинге.
  const isPublic =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  if (isPublic) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  // Защищённая зона /app/* — с фиксированными Header и BottomNav
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/app" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/app/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
          <Route path="/app/chats/*" element={<PrivateRoute><ChatsPage /></PrivateRoute>} />
          <Route path="/app/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
          <Route path="/app/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/app/teacher/groups" element={<PrivateRoute><TeacherGroupsPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default App;