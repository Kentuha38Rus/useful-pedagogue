import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { register, login } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import styles from './Auth.module.scss';

/**
 * Резолвит slug тенанта:
 *   1. ?tenant=school1 (приоритет)
 *   2. поддомен (school1.juurnal.ru → school1); 'app'/'www'/'admin'/'api' игнорируются
 *   3. null
 */
const RESERVED_SUBDOMAINS = new Set(['app', 'admin', 'api', 'www']);

const resolveTenantSlug = (searchParams) => {
  const fromQuery = searchParams.get('tenant');
  if (fromQuery) return fromQuery.toLowerCase().trim();

  const host = window.location.hostname;
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return null;

  const parts = host.split('.');
  if (parts.length >= 3 && !RESERVED_SUBDOMAINS.has(parts[0])) {
    return parts[0].toLowerCase();
  }
  return null;
};

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantSlug = resolveTenantSlug(searchParams);

  const { isAuthenticated, isPlatformAdmin, registerLoading } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isPlatformAdmin ? '/platform' : '/app', { replace: true });
    }
  }, [isAuthenticated, isPlatformAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!tenantSlug) {
      setError(
        'Регистрация возможна только по ссылке школы. Обратитесь к администратору вашей школы.'
      );
      return;
    }

    try {
      // 1. Регистрируем
      await dispatch(register({ email, password, name, tenantSlug })).unwrap();
      // 2. Сразу логиним — получаем токены
      await dispatch(login({ identifier: email, password })).unwrap();
      // 3. navigate произойдёт в useEffect по isAuthenticated
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : err?.message || err?.error || 'Ошибка регистрации';
      setError(msg);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={isPlatformAdmin ? '/platform' : '/app'} replace />;
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <h1>🐢 Регистрация</h1>
        {tenantSlug ? (
          <p className={styles.hint}>
            Школа: <strong>{tenantSlug}</strong>
          </p>
        ) : (
          <p className={styles.hint}>
            Регистрация возможна только по ссылке школы.
          </p>
        )}
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
          <Button
            type="submit"
            variant="primary"
            disabled={registerLoading || !tenantSlug}
          >
            {registerLoading ? 'Загрузка...' : 'Зарегистрироваться'}
          </Button>
        </form>
        <p className={styles.link}>
          Уже есть аккаунт?{' '}
          <Link to={tenantSlug ? `/login?tenant=${tenantSlug}` : '/login'}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;