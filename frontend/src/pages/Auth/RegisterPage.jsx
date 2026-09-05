import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { register } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import styles from './Auth.module.scss'; // ← ИСПРАВЛЕНО: используем существующий файл

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      // Перенаправляем в личный кабинет после регистрации
      window.location.href = '/app';
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await dispatch(register({ username, email, password, name })).unwrap();
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>🐢 Регистрация</h1>
        <form onSubmit={handleSubmit}>
          <Input
            label="Логин"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label="Имя"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email (необязательно)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className={styles.error}>{error}</div>}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </Button>
        </form>
        <p className={styles.link}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;