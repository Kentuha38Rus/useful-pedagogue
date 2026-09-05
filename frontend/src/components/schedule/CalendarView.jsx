import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Card from '../common/Card';
import styles from './CalendarView.module.scss';

const CalendarView = () => {
  const { lessons } = useSelector((state) => state.schedule);
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // заглушка календаря
  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>‹</button>
        <span>{currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>›</button>
      </div>
      <div className={styles.grid}>
        {days.map((day) => (
          <div key={day} className={styles.weekday}>{day}</div>
        ))}
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
          <div key={day} className={styles.day}>
            {day}
            {lessons.some((l) => new Date(l.date).getDate() === day) && <span className={styles.dot} />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;