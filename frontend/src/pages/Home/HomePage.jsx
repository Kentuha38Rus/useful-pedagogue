import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Card from '../../components/common/Card';
import LessonCard from '../../components/schedule/LessonCard';
import styles from './HomePage.module.scss';

const HomePage = () => {
  const { user } = useSelector((state) => state.auth);
  const { lessons } = useSelector((state) => state.schedule);
  const today = new Date().toISOString().slice(0,10);
  const todayLessons = lessons.filter(l => l.date === today);

  return (
    <div className={styles.home}>
      <div className={styles.welcome}>
        <h2>Привет, {user?.name || 'Пользователь'}!</h2>
        <p>Сегодня у вас {todayLessons.length} занятий</p>
      </div>

      <section className={styles.section}>
        <h3>Расписание на сегодня</h3>
        {todayLessons.length === 0 ? (
          <Card>Нет занятий на сегодня</Card>
        ) : (
          todayLessons.map(lesson => <LessonCard key={lesson.id} lesson={lesson} />)
        )}
      </section>

      <section className={styles.section}>
        <h3>Быстрый доступ</h3>
        <div className={styles.quickActions}>
          <Card className={styles.actionCard}>👶 Профиль ребёнка</Card>
          <Card className={styles.actionCard}>📅 Расписание</Card>
        </div>
      </section>
    </div>
  );
};

export default HomePage;