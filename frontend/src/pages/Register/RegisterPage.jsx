import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate } from 'react-router-dom';
import { register } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import styles from './RegisterPage.module.scss';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await dispatch(register({ name, email, password })).unwrap();
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className={styles.registerPage}>
      <div className={styles.card}>
        <h1>🐢 Регистрация</h1>
        <form onSubmit={handleSubmit}>
          <Input
            label="Имя"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
        <p className={styles.loginLink}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;