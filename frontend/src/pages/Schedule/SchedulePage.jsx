import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMySchedule } from '../../store/slices/scheduleSlice';
import { fetchChildren } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';
import styles from './SchedulePage.module.scss';

const SchedulePage = () => {
  const dispatch = useDispatch();
  const { user, children } = useSelector((state) => state.auth);
  const { lessons, loading, error } = useSelector((state) => state.schedule);

  useEffect(() => {
    dispatch(fetchMySchedule());
    if (user?.role === 'parent') {
      dispatch(fetchChildren());
    }
  }, [dispatch, user?.role]);

  // Для родителя — карта "groupId → [имена детей]"
  const childrenByGroup = children.reduce((acc, child) => {
    (child.groups || []).forEach((g) => {
      if (!acc[g.id]) acc[g.id] = [];
      acc[g.id].push(child.name);
    });
    return acc;
  }, {});

  const groupedLessons = lessons.reduce((acc, lesson) => {
    const date = lesson.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(lesson);
    return acc;
  }, {});

  const dates = Object.keys(groupedLessons).sort();

  return (
    <div className={styles.schedulePage}>
      <h1>Расписание занятий</h1>

      {loading && <p className={styles.info}>Загрузка...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && dates.length === 0 && (
        <p className={styles.info}>Занятий пока нет</p>
      )}

      <div className={styles.scheduleList}>
        {dates.map((date) => (
          <div key={date} className={styles.dateGroup}>
            <h3 className={styles.dateHeader}>{formatDate(date)}</h3>

            {groupedLessons[date].map((lesson) => (
              <Card key={lesson.id} className={styles.lessonCard}>
                <div className={styles.lessonTime}>
                  {lesson.startTime?.slice(0, 5)} – {lesson.endTime?.slice(0, 5)}
                </div>

                <div className={styles.lessonInfo}>
                  <p><strong>Группа:</strong> {lesson.group?.name || '—'}</p>

                  {lesson.group?.course && (
                    <p><strong>Курс:</strong> {lesson.group.course.name}</p>
                  )}

                  {user?.role === 'parent' &&
                    lesson.groupId &&
                    childrenByGroup[lesson.groupId] && (
                      <p>
                        <strong>Дети:</strong>{' '}
                        {childrenByGroup[lesson.groupId].join(', ')}
                      </p>
                    )}

                  {user?.role === 'teacher' && lesson.attendances && (
                    <p><strong>Отмечено:</strong> {lesson.attendances.length}</p>
                  )}

                  {lesson.topic && (
                    <p><strong>Тема:</strong> {lesson.topic}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'short',
  });
};

export default SchedulePage;