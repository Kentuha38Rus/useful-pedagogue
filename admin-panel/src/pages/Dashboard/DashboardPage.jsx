import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  if (loading || !stats) {
    return <div>Загрузка статистики...</div>;
  }

  const items = [
    { label: 'Пользователей всего', value: stats.totalUsers },
    { label: 'Учителей', value: stats.totalTeachers },
    { label: 'Родителей', value: stats.totalParents },
    { label: 'Детей', value: stats.totalChildren },
    { label: 'Групп', value: stats.totalGroups },
    { label: 'Курсов', value: stats.totalCourses },
    { label: 'Занятий', value: stats.totalLessons },
    { label: 'Детей без группы', value: stats.unassignedChildren },
  ];

  return (
    <div>
      <h1>Дашборд</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {items.map((item) => (
          <Card key={item.label} style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>{item.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{item.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;