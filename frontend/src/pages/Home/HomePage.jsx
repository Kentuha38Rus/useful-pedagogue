import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMySchedule } from '../../store/slices/scheduleSlice';
import Card from '../../components/common/Card';
import styles from './HomePage.module.scss';

const toLocalDateStr = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { lessons, loading } = useSelector((state) => state.schedule);

  useEffect(() => {
    dispatch(fetchMySchedule());
  }, [dispatch]);

  const tomorrow = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }, []);

  const tomorrowStr = toLocalDateStr(tomorrow);

  const tomorrowLessons = useMemo(
    () =>
      (lessons || [])
        .filter((lesson) => String(lesson.date).slice(0, 10) === tomorrowStr)
        .sort((a, b) =>
          String(a.startTime).localeCompare(String(b.startTime))
        ),
    [lessons, tomorrowStr]
  );

  return (
    <div className={styles.home}>
      <div className={styles.welcome}>
        <h2>Привет, {user?.name || 'Пользователь'}!</h2>
        <p>
          {loading
            ? 'Загружаем расписание...'
            : tomorrowLessons.length > 0
            ? `Завтра у вас ${tomorrowLessons.length} ${pluralLessons(
                tomorrowLessons.length
              )}`
            : 'На завтра занятий нет'}
        </p>
      </div>

      <section className={styles.section}>
        <h3>Быстрый доступ</h3>
        <div className={styles.quickActions}>
          <Card
            className={styles.actionCard}
            onClick={() => navigate('/app/profile')}
          >
            👶 Профиль
          </Card>
          <Card
            className={styles.actionCard}
            onClick={() => navigate('/app/schedule')}
          >
            📅 Расписание
          </Card>
        </div>
      </section>
    </div>
  );
};

const pluralLessons = (count) => {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'занятий';
  if (last === 1) return 'занятие';
  if (last >= 2 && last <= 4) return 'занятия';
  return 'занятий';
};

export default HomePage;
