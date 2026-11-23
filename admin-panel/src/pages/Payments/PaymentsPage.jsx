import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPayments } from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';

const PaymentsPage = () => {
  const dispatch = useDispatch();
  const { payments, loading } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchPayments());
  }, [dispatch]);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1>Платежи (заглушка)</h1>
      <p style={{ marginBottom: '20px' }}>В системе нет реальных платежей, но здесь отображается информация о детях и стоимости курсов.</p>
      <div className="table-scroll">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ background: '#f0f2f5' }}>
              <th>Ребёнок</th>
              <th>Родитель</th>
              <th>Группа</th>
              <th>Курс</th>
              <th>Стоимость</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td data-label="Ребёнок">{p.childName}</td>
                <td data-label="Родитель">{p.parentName || '—'}</td>
                <td data-label="Группа">{p.groupName || '—'}</td>
                <td data-label="Курс">{p.courseName || '—'}</td>
                <td data-label="Стоимость">{p.price} ₽</td>
                <td data-label="Статус">{p.status === 'paid' ? 'Оплачено' : 'Ожидание'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsPage;