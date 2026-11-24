import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMySchedule } from '../../store/slices/scheduleSlice';
import { fetchChildren } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';
import api from '../../utils/api';
import styles from './HomePage.module.scss';

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

const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, children } = useSelector((state) => state.auth);
  const { lessons, loading } = useSelector((state) => state.schedule);
  const [intentState, setIntentState] = useState({});

  useEffect(() => {
    dispatch(fetchMySchedule());
    if (user?.role === 'parent') {
      dispatch(fetchChildren());
    }
  }, [dispatch, user?.role]);

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

  const handleIntent = async (lesson, child, status) => {
    const key = `${lesson.id}:${child.id}`;
    if (intentState[key]?.loading) return;

    setIntentState((prev) => ({
      ...prev,
      [key]: { loading: true, message: '', error: '', status: null },
    }));

    try {
      const response = await api.post(`/schedule/lessons/${lesson.id}/intent`, {
        childId: child.id,
        status,
      });
      setIntentState((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          message:
            response.data?.message || 'Администратор уведомлён в чате',
          error: '',
          status,
        },
      }));
    } catch (error) {
      setIntentState((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          message: '',
          error:
            error.response?.data?.error ||
            error.response?.data?.message ||
            'Не удалось отправить',
          status: null,
        },
      }));
    }
  };

  const isParent = user?.role === 'parent';

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
                      {isSubstitute ? 'Замена' : 'Преподаватель'}:{' '}
                      {teacherName}
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
                      const state = intentState[key] || {};
                      const childName =
                        [child.surname, child.name]
                          .filter(Boolean)
                          .join(' ') || child.name;

                      return (
                        <div key={child.id} className={styles.childRow}>
                          <span className={styles.childName}>{childName}</span>

                          <div className={styles.intentButtons}>
                            <button
                              type="button"
                              className={`${styles.intentBtn} ${styles.intentBtnYes}`}
                              disabled={state.loading}
                              onClick={() => handleIntent(lesson, child, 'yes')}
                            >
                              ✅ Приду
                            </button>
                            <button
                              type="button"
                              className={`${styles.intentBtn} ${styles.intentBtnNo}`}
                              disabled={state.loading}
                              onClick={() => handleIntent(lesson, child, 'no')}
                            >
                              ❌ Не приду
                            </button>
                          </div>

                          {state.message && (
                            <div className={styles.intentMessage}>
                              ✅ {state.message}
                            </div>
                          )}
                          {state.error && (
                            <div className={styles.intentError}>
                              ⚠️ {state.error}
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
