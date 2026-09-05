import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppRouter from './router';
import { loadUser, forceInitialized } from './store/slices/authSlice';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { user, loading, initialized } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user && !loading && !initialized) {
      dispatch(loadUser());
    }

    // Если через 5 секунд всё ещё не инициализировано – принудительно завершаем загрузку
    const timer = setTimeout(() => {
      if (!initialized) {
        console.warn('⚠️ LoadUser timeout – force initialized');
        dispatch(forceInitialized());
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [dispatch, user, loading, initialized]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;