import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMySchedule } from '../../store/slices/scheduleSlice';
import CalendarView from '../../components/schedule/CalendarView';
import TomorrowLessons from '../../components/schedule/TomorrowLessons';
import styles from './SchedulePage.module.scss';

const toLocalDateStr = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const SchedulePage = () => {
  const dispatch = useDispatch();
  const { lessons, loading, error } = useSelector((state) => state.schedule);

  useEffect(() => {
    dispatch(fetchMySchedule());
  }, [dispatch]);

  const todayStr = toLocalDateStr(new Date());

  // Прошлые занятия в календаре не показываем
  const upcomingLessons = useMemo(
    () =>
      (lessons || []).filter(
        (lesson) => String(lesson.date).slice(0, 10) >= todayStr
      ),
    [lessons, todayStr]
  );

  return (
    <div className={styles.schedulePage}>
      <h1>Расписание занятий</h1>

      {loading && <p className={styles.info}>Загрузка...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && upcomingLessons.length === 0 && (
        <p className={styles.info}>Занятий пока нет</p>
      )}

      <CalendarView lessons={upcomingLessons} />
      <TomorrowLessons lessons={upcomingLessons} loading={loading} />
    </div>
  );
};

export default SchedulePage;
