import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loginLoading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(login({ identifier, password })).unwrap();
      // Редирект сразу после успешного входа
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f0f2f5',
  };
  const cardStyle = {
    width: '400px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    background: 'white',
    borderRadius: '8px',
  };
  const errorStyle = {
    color: 'red',
    marginBottom: '10px',
  };

  return (
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <h2>Вход в админ-панель</h2>
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
          {error && <div style={errorStyle}>{error}</div>}
          <Button type="submit" variant="primary" disabled={loginLoading}>
            {loginLoading ? 'Загрузка...' : 'Войти'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;