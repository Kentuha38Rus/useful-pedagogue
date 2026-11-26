import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchChildren } from '../../store/slices/authSlice';
import Card from '../common/Card';
import useLessonIntent from '../../hooks/useLessonIntent';
import styles from './TomorrowLessons.module.scss';

const formatTime = (value) => (value ? String(value).slice(0, 5) : '');

const toLocalDateStr = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateRu = (dateStr) => {
  const date = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
};

const TomorrowLessons = ({ lessons = [], loading = false }) => {
  const dispatch = useDispatch();
  const { user, children } = useSelector((state) => state.auth);
  const { state, respond } = useLessonIntent();

  useEffect(() => {
    if (user?.role === 'parent') {
      dispatch(fetchChildren());
    }
  }, [dispatch, user?.role]);

  const tomorrowStr = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return toLocalDateStr(tomorrow);
  }, []);

  const tomorrowLessons = useMemo(
    () =>
      (lessons || [])
        .filter((lesson) => String(lesson.date).slice(0, 10) === tomorrowStr)
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))),
    [lessons, tomorrowStr]
  );

  // groupId -> дети этого родителя
  const childrenByGroup = useMemo(() => {
    const map = {};
    (children || []).forEach((child) => {
      (child.groups || []).forEach((group) => {
        if (!map[group.id]) map[group.id] = [];
        map[group.id].push(child);
      });
    });
    return map;
  }, [children]);

  const isParent = user?.role === 'parent';

  return (
    <section className={styles.section}>
      <h3>Расписание на завтра</h3>
      <div className={styles.tomorrowDate}>{formatDateRu(tomorrowStr)}</div>

      {tomorrowLessons.length === 0 ? (
        <Card className={styles.emptyCard}>
          {loading ? 'Загрузка...' : 'Нет занятий на завтра'}
        </Card>
      ) : (
        tomorrowLessons.map((lesson) => {
          const teacherName =
            lesson.substituteTeacher?.name || lesson.group?.teacher?.name;
          const isSubstitute = Boolean(lesson.substituteTeacher);
          const lessonChildren = childrenByGroup[lesson.groupId] || [];

          return (
            <Card key={lesson.id} className={styles.lessonCard}>
              <div className={styles.lessonHeader}>
                <span className={styles.lessonTime}>
                  {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                </span>
                <span className={styles.lessonGroup}>
                  {lesson.group?.name || 'Группа'}
                </span>
              </div>

              <div className={styles.lessonInfo}>
                {lesson.group?.course?.name && (
                  <span>Курс: {lesson.group.course.name}</span>
                )}
                {teacherName && (
                  <span>
                    {isSubstitute ? 'Замена' : 'Преподаватель'}: {teacherName}
                  </span>
                )}
              </div>

              {lesson.topic && (
                <div className={styles.lessonTopic}>Тема: {lesson.topic}</div>
              )}

              {isParent && lessonChildren.length > 0 && (
                <div className={styles.confirmBlock}>
                  <div className={styles.confirmTitle}>
                    Подтвердите присутствие
                  </div>

                  {lessonChildren.map((child) => {
                    const key = `${lesson.id}:${child.id}`;
                    const childState = state[key] || {};
                    const childName =
                      [child.surname, child.name].filter(Boolean).join(' ') ||
                      child.name;

                    return (
                      <div key={child.id} className={styles.childRow}>
                        <span className={styles.childName}>{childName}</span>

                        <div className={styles.intentButtons}>
                          <button
                            type="button"
                            className={`${styles.intentBtn} ${styles.intentBtnYes}`}
                            disabled={childState.loading || childState.status}
                            onClick={() => respond(lesson.id, child.id, 'yes')}
                          >
                            ✅ Приду
                          </button>
                          <button
                            type="button"
                            className={`${styles.intentBtn} ${styles.intentBtnNo}`}
                            disabled={childState.loading || childState.status}
                            onClick={() => respond(lesson.id, child.id, 'no')}
                          >
                            ❌ Не приду
                          </button>
                        </div>

                        {childState.message && (
                          <div className={styles.intentMessage}>
                            ✅ {childState.message}
                          </div>
                        )}
                        {childState.error && (
                          <div className={styles.intentError}>
                            ⚠️ {childState.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })
      )}
    </section>
  );
};

export default TomorrowLessons;
