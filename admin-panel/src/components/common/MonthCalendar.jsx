import React, { useMemo, useState } from 'react';
import './MonthCalendar.css';

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

const pluralLessons = (count) => {
  const lastTwo = count % 100;
  const last = count % 10;
  let word = 'занятий';
  if (lastTwo < 11 || lastTwo > 14) {
    if (last === 1) word = 'занятие';
    else if (last >= 2 && last <= 4) word = 'занятия';
  }
  return `${count} ${word}`;
};

const getInitialMonth = (initialMonth) => {
  if (typeof initialMonth === 'string' && /^\d{4}-\d{2}$/.test(initialMonth)) {
    const [year, month] = initialMonth.split('-').map(Number);
    if (month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/**
 * Месячный календарь с отмеченными днями, в которые есть занятия.
 * Используется в дашборде для расписания учителя.
 */
const MonthCalendar = ({
  lessons = [],
  loading = false,
  onSubstitute,
  initialMonth,
}) => {
  const [monthDate, setMonthDate] = useState(() => getInitialMonth(initialMonth));
  const [selectedDate, setSelectedDate] = useState(null);
  const now = new Date();

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
    <div className="mc">
      <div className="mc-head">
        <button
          type="button"
          className="mc-nav"
          onClick={() => changeMonth(-1)}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <span className="mc-month">
          {monthDate.toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <button
          type="button"
          className="mc-nav"
          onClick={() => changeMonth(1)}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className="mc-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="mc-weekday">
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="mc-day" aria-hidden="true" />;
          }
          const key = toKey(year, month, day);
          const dayLessons = lessonsByDate[key] || [];
          const hasLessons = dayLessons.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          const classes = [
            'mc-day',
            hasLessons ? 'mc-day--marked' : '',
            isToday ? 'mc-day--today' : '',
            isSelected ? 'mc-day--selected' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={key}
              type="button"
              className={classes}
              disabled={!hasLessons}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              title={hasLessons ? pluralLessons(dayLessons.length) : 'Занятий нет'}
            >
              <span>{day}</span>
              {hasLessons && <span className="mc-dot" />}
            </button>
          );
        })}
      </div>

      <div className="mc-summary">
        {loading
          ? 'Загрузка расписания...'
          : monthLessons > 0
          ? `В этом месяце: ${pluralLessons(monthLessons)}. Нажмите на отмеченный день, чтобы увидеть подробности.`
          : 'В этом месяце занятий нет'}
      </div>

      {selectedDate && (
        <div className="mc-details">
          <div className="mc-details-head">
            <span className="mc-details-date">{formatDateRu(selectedDate)}</span>
            <span className="mc-details-count">
              {pluralLessons(selectedLessons.length)}
            </span>
          </div>

          {selectedLessons.length === 0 ? (
            <div className="mc-empty">Занятий нет</div>
          ) : (
            selectedLessons.map((lesson) => (
              <div key={lesson.id} className="mc-lesson">
                <span className="mc-time">
                  {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                </span>
                <div className="mc-lesson-body">
                  <div className="mc-lesson-group">
                    {lesson.groupName || 'Группа'}
                    {lesson.courseName ? ` · ${lesson.courseName}` : ''}
                  </div>
                  {lesson.topic && (
                    <div className="mc-lesson-topic">{lesson.topic}</div>
                  )}
                  {lesson.substituteTeacherId && lesson.substituteTeacherName && (
                    <div className="mc-lesson-topic">
                      Замена: {lesson.substituteTeacherName}
                    </div>
                  )}
                </div>
                {onSubstitute && (
                  <button
                    type="button"
                    className="mc-substitute-btn"
                    onClick={() => onSubstitute(lesson)}
                  >
                    Заменить
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MonthCalendar;
