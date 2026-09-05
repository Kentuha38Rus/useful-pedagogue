import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import styles from './LoginPage.module.scss';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // заменяем email на identifier
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // Вход по логину (username) или email
        await dispatch(login({ identifier, password })).unwrap();
        navigate('/');
      } else {
        // Регистрация – предполагаем, что создаётся пользователь с username (логин)
        // Администратор создаёт пользователей, но если регистрация доступна,
        // используем поле identifier как username (или email, если передать)
        // Для простоты будем считать, что identifier — это username
        await dispatch(register({ username: identifier, name, password })).unwrap();
        // После регистрации автоматически логинимся
        await dispatch(login({ identifier, password })).unwrap();
        navigate('/');
      }
    } catch (err) {
      alert('Ошибка: ' + err);
    }
  };

  return (
    <div className={styles.container}>
      <h2>{isLogin ? 'Вход' : 'Регистрация'}</h2>
      <form onSubmit={handleSubmit} noValidate> {/* отключаем встроенную валидацию */}
        {!isLogin && (
          <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        {/* Поле теперь "Логин или Email", type="text" */}
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
        <Button type="submit" variant="primary">
          {isLogin ? 'Войти' : 'Зарегистрироваться'}
        </Button>
      </form>
      <p>
        {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', color: '#6B6B3D', textDecoration: 'underline' }}
        >
          {isLogin ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </p>
    </div>
  );
};

export default LoginPage;