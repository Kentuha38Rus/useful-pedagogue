import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchChildren } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';
import styles from './SchedulePage.module.scss';

const SchedulePage = () => {
  const dispatch = useDispatch();
  const { children } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchChildren());
  }, [dispatch]);

  // Собираем все занятия из групп детей
  const allLessons = children
    .filter(child => child.group && child.group.lessons && child.group.lessons.length > 0)
    .flatMap(child => 
      child.group.lessons.map(lesson => ({
        ...lesson,
        childName: child.name,
        groupName: child.group.name,
        groupId: child.group.id,
      }))
    )
    .sort((a, b) => {
      // Сортировка по дате и времени
      const dateA = new Date(a.date + 'T' + a.startTime);
      const dateB = new Date(b.date + 'T' + b.startTime);
      return dateA - dateB;
    });

  // Группировка по дате (для удобства)
  const groupedLessons = allLessons.reduce((acc, lesson) => {
    const date = lesson.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(lesson);
    return acc;
  }, {});

  const dates = Object.keys(groupedLessons).sort();

  return (
    <div className={styles.schedulePage}>
      <h1>Расписание занятий</h1>
      {allLessons.length === 0 ? (
        <p>У ваших детей пока нет занятий</p>
      ) : (
        <div className={styles.scheduleList}>
          {dates.map(date => (
            <div key={date} className={styles.dateGroup}>
              <h3 className={styles.dateHeader}>{date}</h3>
              {groupedLessons[date].map(lesson => (
                <Card key={lesson.id} className={styles.lessonCard}>
                  <div className={styles.lessonTime}>
                    <span>{lesson.startTime} – {lesson.endTime}</span>
                  </div>
                  <div className={styles.lessonInfo}>
                    <p><strong>Ребёнок:</strong> {lesson.childName}</p>
                    <p><strong>Группа:</strong> {lesson.groupName}</p>
                    {lesson.topic && <p><strong>Тема:</strong> {lesson.topic}</p>}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchedulePage;