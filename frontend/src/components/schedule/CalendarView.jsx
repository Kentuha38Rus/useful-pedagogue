import React, { useMemo, useState } from 'react';
import styles from './CalendarView.module.scss';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const pad2 = (n) => String(n).padStart(2, '0');

const toKey = (year, month, day) => `${year}-${pad2(month + 1)}-${pad2(day)}`;

const formatTime = (value) => (value ? String(value).slice(0, 5) : '');

const formatDateRu = (key) => {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
};

/**
 * Календарь занятий на месяц с отмеченными датами.
 * Используется в личном кабинете родителя и преподавателя.
 */
const CalendarView = ({ lessons = [] }) => {
  const now = new Date();
  const [monthDate, setMonthDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(null);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const lessonsByDate = useMemo(() => {
    const map = {};
    (lessons || []).forEach((lesson) => {
      if (!lesson || !lesson.date) return;
      const key = String(lesson.date).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(lesson);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    );
    return map;
  }, [lessons]);

  const monthPrefix = `${year}-${pad2(month + 1)}`;

  const monthLessonsCount = useMemo(
    () =>
      Object.keys(lessonsByDate)
        .filter((key) => key.startsWith(monthPrefix))
        .reduce((acc, key) => acc + lessonsByDate[key].length, 0),
    [lessonsByDate, monthPrefix]
  );

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedLessons = selectedDate ? lessonsByDate[selectedDate] || [] : [];

  const changeMonth = (delta) => {
    setMonthDate(new Date(year, month + delta, 1));
    setSelectedDate(null);
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => changeMonth(-1)}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <span className={styles.monthTitle}>
          {monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => changeMonth(1)}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((day) => (
          <div key={day} className={styles.weekday}>
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className={styles.emptyCell} />;
          }
          const key = toKey(year, month, day);
          const dayLessons = lessonsByDate[key] || [];
          const hasLessons = dayLessons.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          return (
            <button
              type="button"
              key={key}
              className={[
                styles.day,
                hasLessons ? styles.marked : '',
                isToday ? styles.today : '',
                isSelected ? styles.selected : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              disabled={!hasLessons}
              title={hasLessons ? `Занятий: ${dayLessons.length}` : 'Занятий нет'}
            >
              <span>{day}</span>
              {hasLessons && <span className={styles.dot} />}
            </button>
          );
        })}
      </div>

      <div className={styles.summary}>
        {monthLessonsCount > 0
          ? `Занятий в этом месяце: ${monthLessonsCount}`
          : 'В этом месяце занятий нет'}
      </div>

      {selectedDate && (
        <div className={styles.dayDetails}>
          <div className={styles.dayTitle}>{formatDateRu(selectedDate)}</div>
          {selectedLessons.length === 0 ? (
            <p className={styles.info}>Занятий нет</p>
          ) : (
            <ul className={styles.lessonList}>
              {selectedLessons.map((lesson) => {
                const teacherName =
                  lesson.substituteTeacher?.name ||
                  lesson.group?.teacher?.name;
                const isSubstitute = Boolean(lesson.substituteTeacher);

                return (
                  <li key={lesson.id} className={styles.lessonItem}>
                    <div className={styles.lessonTop}>
                      <span className={styles.lessonTime}>
                        {formatTime(lesson.startTime)}–
                        {formatTime(lesson.endTime)}
                      </span>
                      <span className={styles.lessonGroup}>
                        {lesson.group?.name || 'Группа'}
                      </span>
                    </div>

                    <div className={styles.lessonMeta}>
                      {lesson.group?.course?.name && (
                        <span>Курс: {lesson.group.course.name}</span>
                      )}
                      {teacherName && (
                        <span>
                          {isSubstitute ? 'Замена' : 'Преподаватель'}:{' '}
                          {teacherName}
                        </span>
                      )}
                    </div>

                    {lesson.topic && (
                      <div className={styles.lessonTopic}>
                        Тема: {lesson.topic}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setSelectedDate(null)}
          >
            Скрыть
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
