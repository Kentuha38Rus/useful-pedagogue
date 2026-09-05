import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addChildThunk, updateChildThunk } from '../../store/slices/authSlice';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import styles from './ChildProfile.module.scss';

const ChildProfile = ({ child, onClose }) => {
  const [name, setName] = useState(child?.name || '');
  const [birthDate, setBirthDate] = useState(child?.birthDate || '');
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { name };
      if (birthDate) payload.birthDate = birthDate; // формат "YYYY-MM-DD"
      console.log('Sending child data:', payload);
      if (child) {
        await dispatch(updateChildThunk({ id: child.id, ...payload })).unwrap();
      } else {
        await dispatch(addChildThunk(payload)).unwrap();
      }
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения ребёнка:', err);
      alert(`Не удалось сохранить: ${err.message || 'Попробуйте позже'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modal}>
      <Card>
        <h3>{child ? 'Редактировать' : 'Добавить'} ребёнка</h3>
        <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Дата рождения (ГГГГ-ММ-ДД)" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="например, 2018-05-10" />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Отмена</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChildProfile;