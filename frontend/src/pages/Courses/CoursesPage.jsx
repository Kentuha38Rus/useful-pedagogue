import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourses, fetchChildren } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';
import styles from './CoursesPage.module.scss';

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return `${number.toLocaleString('ru-RU')} ₽`;
};

const CoursesPage = () => {
  const dispatch = useDispatch();
  const { courses, children } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchChildren());
  }, [dispatch]);

  // Карта: courseId -> { children: [...], groups: [...] }
  const enrollments = useMemo(() => {
    const map = {};

    (children || []).forEach((child) => {
      (child.groups || []).forEach((group) => {
        const courseId = group.courseId;
        if (!courseId) return;

        if (!map[courseId]) {
          map[courseId] = { childNames: [], groupNames: [] };
        }

        const displayName =
          [child.surname, child.name].filter(Boolean).join(' ') ||
          child.name ||
          'Ребёнок';

        if (!map[courseId].childNames.includes(displayName)) {
          map[courseId].childNames.push(displayName);
        }
        if (group.name && !map[courseId].groupNames.includes(group.name)) {
          map[courseId].groupNames.push(group.name);
        }
      });
    });

    return map;
  }, [children]);

  // Сначала курсы, куда ребёнок уже ходит, затем доступные
  const sortedCourses = useMemo(() => {
    return [...(courses || [])].sort((a, b) => {
      const aEnrolled = enrollments[a.id] ? 0 : 1;
      const bEnrolled = enrollments[b.id] ? 0 : 1;
      if (aEnrolled !== bEnrolled) return aEnrolled - bEnrolled;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
    });
  }, [courses, enrollments]);

  return (
    <div className={styles.coursesPage}>
      <div className={styles.hero}>
        <h1>Курсы центра</h1>
        <p>
          Здесь видно, на какие занятия уже ходит ваш ребёнок, а какие ещё
          можно попробовать.
        </p>
      </div>

      {children.length === 0 && (
        <Card className={styles.notice}>
          Детей пока нет. Чтобы увидеть записи на курсы, попросите
          администратора школы добавить ребёнка.
        </Card>
      )}

      {sortedCourses.length === 0 ? (
        <Card className={styles.notice}>
          Курсы пока не добавлены. Загляните позже.
        </Card>
      ) : (
        <div className={styles.courseList}>
          {sortedCourses.map((course) => {
            const enrolled = enrollments[course.id];
            const price = formatPrice(course.price);

            return (
              <Card
                key={course.id}
                className={`${styles.courseCard} ${
                  enrolled ? styles.courseCardEnrolled : ''
                }`}
              >
                <div className={styles.cardHead}>
                  <h3>{course.name}</h3>
                  {enrolled ? (
                    <span className={styles.badgeEnrolled}>
                      ✓ Уже занимаетесь
                    </span>
                  ) : (
                    <span className={styles.badgeAvailable}>
                      Можно записаться
                    </span>
                  )}
                </div>

                {course.description && (
                  <p className={styles.description}>{course.description}</p>
                )}

                {price && (
                  <div className={styles.price}>Стоимость: {price}</div>
                )}

                {enrolled ? (
                  <div className={styles.enrolledInfo}>
                    <p>
                      <strong>Ребёнок:</strong>{' '}
                      {enrolled.childNames.join(', ')}
                    </p>
                    {enrolled.groupNames.length > 0 && (
                      <p>
                        <strong>Группа:</strong>{' '}
                        {enrolled.groupNames.join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className={styles.availableInfo}>
                    <p>Есть свободные места — можно записать ребёнка.</p>
                    <p className={styles.note}>
                      Чтобы записаться, напишите администратору школы в чате
                      или на занятии.
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
