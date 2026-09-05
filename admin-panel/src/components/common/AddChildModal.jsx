import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailableChildren, addChildToGroup } from '../../store/slices/adminSlice';
import Button from './Button';
import Card from './Card';

const AddChildModal = ({ isOpen, onClose, groupId, onChildAdded }) => {
  const dispatch = useDispatch();
  const { availableChildren, loading } = useSelector((state) => state.admin);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [error, setError] = useState(null);

  // Защита от undefined – всегда используем массив
  const childrenList = availableChildren || [];

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchAvailableChildren());
      setSelectedChildId('');
      setError(null);
    }
  }, [isOpen, dispatch]);

  const handleAdd = async () => {
    if (!selectedChildId) {
      setError('Пожалуйста, выберите ребенка');
      return;
    }
    try {
      await dispatch(addChildToGroup({ childId: selectedChildId, groupId })).unwrap();
      setSelectedChildId('');
      onChildAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Ошибка при добавлении ребенка');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <Card style={{ padding: '20px', minWidth: '400px' }}>
          <h3>Добавить ребенка в группу</h3>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="childSelect">Выберите ребенка:</label>
            <select
              id="childSelect"
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              disabled={loading}
            >
              <option value="">-- Выберите --</option>
              {childrenList.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name} {child.parent ? `(родитель: ${child.parent.name})` : ''}
                </option>
              ))}
            </select>
            {childrenList.length === 0 && !loading && (
              <p style={{ color: '#888', fontSize: '14px' }}>
                Нет доступных детей для добавления
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleAdd} disabled={loading || !selectedChildId}>
              Добавить
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modal: {
    background: 'white',
    borderRadius: '8px',
    padding: '0',
  },
};

export default AddChildModal;