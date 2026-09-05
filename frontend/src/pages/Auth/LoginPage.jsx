import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import styles from './Auth.module.scss';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loginLoading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(login({ identifier, password })).unwrap();
      navigate('/app');
    } catch (err) {
      // ошибка уже сохранена в state.error
    }
  };

  return (
    <div className={styles.authPage}>
      <Card className={styles.authCard}>
        <h2>Вход</h2>
        <form onSubmit={handleSubmit}>
          <Input
            label="Логин или Email"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
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
          <Button type="submit" variant="primary" disabled={loginLoading}>
            {loginLoading ? 'Загрузка...' : 'Войти'}
          </Button>
        </form>
        <p className={styles.link}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;