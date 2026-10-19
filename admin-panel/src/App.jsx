import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppRouter from './router';
import { loadUser, forceInitialized } from './store/slices/authSlice';
import { initSocket, fetchDialogs } from './store/slices/chatSlice';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { user, loading, initialized, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  // Загрузка профиля
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user && !loading && !initialized) {
      dispatch(loadUser());
    }

    const timer = setTimeout(() => {
      if (!initialized) {
        console.warn('⚠️ LoadUser timeout – force initialized');
        dispatch(forceInitialized());
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [dispatch, user, loading, initialized]);

  // Инициализация чата после появления user
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    dispatch(initSocket());
    dispatch(fetchDialogs());
  }, [dispatch, isAuthenticated, user?.id]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;