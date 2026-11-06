import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { login, logout } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import styles from './Auth.module.scss';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantSlug = searchParams.get('tenant');

  const { loginLoading, error, isAuthenticated, isPlatformAdmin } = useSelector(
    (state) => state.auth
  );

  // На /login сбрасываем старую сессию, чтобы не «залипал» предыдущий аккаунт
  useEffect(() => {
    dispatch(logout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isPlatformAdmin ? '/platform' : '/app', { replace: true });
    }
  }, [isAuthenticated, isPlatformAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(login({ identifier, password })).unwrap();
    } catch {
      // ошибка уже в state.error
    }
  };

  return (
    <div className={styles.authPage}>
      <Card className={styles.authCard}>
        <h2>Вход</h2>
        {tenantSlug && (
          <p className={styles.hint}>
            Школа: <strong>{tenantSlug}</strong>
          </p>
        )}
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
          Забыли пароль? Обратитесь к администратору вашего центра.
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;