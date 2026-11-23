import React, { useMemo, useState } from 'react';

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
 * Месячный календарь с отмеченными днями, в которые есть занятия.
 * Используется в дашборде для расписания учителя.
 */
const MonthCalendar = ({ lessons = [], loading = false }) => {
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

  const monthLessons = useMemo(
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
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <button
          type="button"
          style={styles.navBtn}
          onClick={() => changeMonth(-1)}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
          {monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          style={styles.navBtn}
          onClick={() => changeMonth(1)}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div style={styles.grid}>
        {WEEKDAYS.map((day) => (
          <div key={day} style={styles.weekday}>
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} style={styles.emptyCell} />;
          }
          const key = toKey(year, month, day);
          const dayLessons = lessonsByDate[key] || [];
          const hasLessons = dayLessons.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          return (
            <button
              key={key}
              type="button"
              disabled={!hasLessons}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              title={hasLessons ? `Занятий: ${dayLessons.length}` : 'Занятий нет'}
              style={{
                ...styles.day,
                ...(hasLessons ? styles.dayMarked : null),
                ...(isToday ? styles.dayToday : null),
                ...(isSelected ? styles.daySelected : null),
                cursor: hasLessons ? 'pointer' : 'default',
              }}
            >
              <span>{day}</span>
              {hasLessons && <span style={styles.dot} />}
            </button>
          );
        })}
      </div>

      <div style={styles.summary}>
        {loading
          ? 'Загрузка расписания...'
          : monthLessons > 0
          ? `Занятий в этом месяце: ${monthLessons}. Нажмите на день, чтобы увидеть подробности.`
          : 'В этом месяце занятий нет'}
      </div>

      {selectedDate && (
        <div style={styles.dayDetails}>
          <div style={styles.dayTitle}>{formatDateRu(selectedDate)}</div>
          {selectedLessons.length === 0 ? (
            <div style={{ fontSize: 13, color: '#64748b' }}>Занятий нет</div>
          ) : (
            <ul style={styles.lessonList}>
              {selectedLessons.map((lesson) => (
                <li key={lesson.id} style={styles.lessonItem}>
                  <span style={styles.lessonTime}>
                    {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                  </span>
                  <span>
                    {lesson.groupName || 'Группа'}
                    {lesson.courseName ? ` · ${lesson.courseName}` : ''}
                    {lesson.topic ? ` · ${lesson.topic}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    borderRadius: 6,
    width: 32,
    height: 32,
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#1e293b',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
  },
  weekday: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    padding: '4px 0',
  },
  emptyCell: {
    minHeight: 38,
  },
  day: {
    position: 'relative',
    minHeight: 38,
    border: '1px solid transparent',
    background: '#f8fafc',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: 'inherit',
    fontSize: 13,
    color: '#334155',
    padding: 0,
  },
  dayMarked: {
    background: '#dbeafe',
    borderColor: '#93c5fd',
    fontWeight: 700,
    color: '#1e3a8a',
  },
  dayToday: {
    borderColor: '#2563eb',
  },
  daySelected: {
    background: '#2563eb',
    borderColor: '#1d4ed8',
    color: '#fff',
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'currentColor',
  },
  summary: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
  },
  dayDetails: {
    marginTop: 10,
    padding: 10,
    background: '#f8fafc',
    borderRadius: 8,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  lessonList: {
    margin: 0,
    paddingLeft: 18,
  },
  lessonItem: {
    fontSize: 13,
    padding: '3px 0',
  },
  lessonTime: {
    fontWeight: 600,
    marginRight: 6,
  },
};

export default MonthCalendar;
