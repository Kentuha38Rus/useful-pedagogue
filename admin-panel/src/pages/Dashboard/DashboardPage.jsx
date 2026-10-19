import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../../store/slices/adminSlice';
import api from '../../utils/api';

const getLocalDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTime = (t) => (t ? String(t).slice(0, 5) : '');
const formatDate = (d) => {
  if (!d) return '';
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-');
  if (!y || !m || !day) return s;
  return `${day}.${m}.${y}`;
};
const formatPrice = (value, currency = '₽') => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('ru-RU')} ${currency}`;
};

// Метаданные статусов занятий
const STATUS_META = {
  planned: {
    label: 'Запланировано',
    icon: '🕒',
    color: '#1e3a8a',
    bg: '#dbeafe',
  },
  done: {
    label: 'Проведено',
    icon: '✅',
    color: '#14532d',
    bg: '#dcfce7',
  },
  no_mark: {
    label: 'Без отметки',
    icon: '⚠️',
    color: '#7f1d1d',
    bg: '#fee2e2',
  },
  cancelled: {
    label: 'Отменено',
    icon: '🚫',
    color: '#334155',
    bg: '#e2e8f0',
  },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        color: meta.color,
        background: meta.bg,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { stats, loading, error } = useSelector((state) => state.admin);

  const [expanded, setExpanded] = useState(null);

  // Состояние отправки для каждого занятия: lessonId -> { loading, message, error, cooldown }
  const [notifyByLesson, setNotifyByLesson] = useState({});

  const timersRef = useRef({});

  useEffect(() => {
    dispatch(fetchStats({ date: getLocalDateString() }));
  }, [dispatch]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearInterval(t));
    };
  }, []);

  const setLessonState = (lessonId, patch) => {
    setNotifyByLesson((prev) => ({
      ...prev,
      [lessonId]: { ...(prev[lessonId] || {}), ...patch },
    }));
  };

  const startCooldown = (lessonId, seconds) => {
    setLessonState(lessonId, { cooldown: seconds });

    if (timersRef.current[lessonId]) {
      clearInterval(timersRef.current[lessonId]);
    }
    timersRef.current[lessonId] = setInterval(() => {
      setNotifyByLesson((prev) => {
        const cur = prev[lessonId];
        if (!cur || (cur.cooldown ?? 0) <= 1) {
          clearInterval(timersRef.current[lessonId]);
          delete timersRef.current[lessonId];
          return { ...prev, [lessonId]: { ...cur, cooldown: 0 } };
        }
        return { ...prev, [lessonId]: { ...cur, cooldown: cur.cooldown - 1 } };
      });
    }, 1000);
  };

  const handleNotifyLesson = async (lessonId) => {
    const state = notifyByLesson[lessonId] || {};
    if (state.loading || (state.cooldown ?? 0) > 0) return;

    setLessonState(lessonId, {
      loading: true,
      message: '',
      error: '',
    });

    try {
      const res = await api.post(
        `/notifications/lesson-reminders/lesson/${lessonId}`
      );

      setLessonState(lessonId, {
        loading: false,
        message: res.data.message || `Отправлено ${res.data.sent}`,
        error: '',
      });

      startCooldown(lessonId, 60);
    } catch (e) {
      const retry = e.response?.data?.retryAfterSec || 0;
      setLessonState(lessonId, {
        loading: false,
        message: '',
        error: e.response?.data?.error || 'Не удалось отправить',
      });
      if (retry > 0) startCooldown(lessonId, retry);
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
        Загрузка статистики...
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>
        Не удалось загрузить статистику{error ? `: ${error}` : ''}
      </div>
    );
  }

  const details = stats.details || {};

  const cards = [
    {
      key: 'users',
      label: 'Пользователей всего',
      value: stats.totalUsers ?? 0,
      icon: '👥',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      items: [
        { title: 'Администраторы', subtitle: `${stats.totalAdmins ?? 0} чел.` },
        { title: 'Учителя', subtitle: `${stats.totalTeachers ?? 0} чел.` },
        { title: 'Родители', subtitle: `${stats.totalParents ?? 0} чел.` },
      ],
      emptyText: 'Нет данных',
    },
    {
      key: 'teachers',
      label: 'Учителей',
      value: stats.totalTeachers ?? 0,
      icon: '👨‍🏫',
      gradient: 'linear-gradient(135deg, #2196f3 0%, #00bcd4 100%)',
      items: (details.teachers || []).map((t) => ({
        title: t.name || t.username || 'Без имени',
        subtitle:
          [t.email, t.username ? `@${t.username}` : null]
            .filter(Boolean)
            .join(' • ') || '—',
      })),
      emptyText: 'Учителей нет',
    },
    {
      key: 'parents',
      label: 'Родителей',
      value: stats.totalParents ?? 0,
      icon: '👪',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      items: (details.parents || []).map((p) => ({
        title: p.name || p.username || 'Без имени',
        subtitle:
          [p.email, p.username ? `@${p.username}` : null]
            .filter(Boolean)
            .join(' • ') || '—',
      })),
      emptyText: 'Родителей нет',
    },
    {
      key: 'children',
      label: 'Детей',
      value: stats.totalChildren ?? 0,
      icon: '🧒',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      items: (details.children || []).map((c) => ({
        title: c.name || 'Без имени',
        subtitle: c.birthDate
          ? `Дата рождения: ${formatDate(c.birthDate)}`
          : 'Дата рождения не указана',
      })),
      emptyText: 'Детей нет',
    },
    {
      key: 'groups',
      label: 'Групп',
      value: stats.totalGroups ?? 0,
      icon: '🎓',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      items: (details.groups || []).map((g) => ({
        title: g.name || 'Без названия',
        subtitle:
          [
            g.courseName ? `Курс: ${g.courseName}` : null,
            g.teacherName ? `Учитель: ${g.teacherName}` : null,
            `Учеников: ${g.childrenCount ?? 0}/${g.maxStudents ?? 0}`,
          ]
            .filter(Boolean)
            .join(' • '),
      })),
      emptyText: 'Групп нет',
    },
    {
      key: 'courses',
      label: 'Курсов',
      value: stats.totalCourses ?? 0,
      icon: '📚',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      items: (details.courses || []).map((c) => ({
        title: c.name || 'Без названия',
        subtitle:
          c.price !== null && c.price !== undefined
            ? `Стоимость: ${formatPrice(c.price)}`
            : 'Стоимость не указана',
      })),
      emptyText: 'Курсов нет',
    },
    {
      key: 'todayLessons',
      label: 'Занятий сегодня',
      value: stats.todayLessons ?? 0,
      icon: '📅',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      items: details.todayLessons || [],
      emptyText: 'Сегодня занятий нет',
    },
    {
      key: 'unassignedChildren',
      label: 'Детей без группы',
      value: stats.unassignedChildren ?? 0,
      icon: '⚠️',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      items: (details.unassignedChildren || []).map((c) => ({
        title: c.name || 'Без имени',
        subtitle: c.birthDate
          ? `Дата рождения: ${formatDate(c.birthDate)}`
          : 'Дата рождения не указана',
      })),
      emptyText: 'Все дети распределены по группам',
    },
  ];

  return (
    <div style={{ padding: '8px 4px' }}>
      <style>{`
        .dash-card { transition: box-shadow .2s ease, transform .15s ease; }
        .dash-card:hover { box-shadow: 0 14px 28px rgba(0,0,0,0.18); }
        .dash-card:focus-visible { outline: 3px solid rgba(255,255,255,0.85); outline-offset: 2px; }
        .dash-card-header { display: flex; align-items: center; gap: 16px; cursor: pointer; user-select: none; }
        .dash-details { animation: dashFadeIn .22s ease; }
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .dash-scroll::-webkit-scrollbar { width: 8px; }
        .dash-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.45); border-radius: 4px; }
        .dash-lesson-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.25); }
        .dash-lesson-row:last-child { border-bottom: none; }
        .dash-lesson-info { flex: 1; min-width: 0; }
        .dash-notify-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.95);
          color: #0f172a;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: background .15s ease, transform .1s ease;
          white-space: nowrap;
        }
        .dash-notify-btn:hover:not(:disabled) { background: #ffffff; transform: translateY(-1px); }
        .dash-notify-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Дашборд</h1>
        <div style={{ color: '#888', fontSize: 14 }}>Данные на {formatDate(stats.today)}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {cards.map((card) => {
          const isOpen = expanded === card.key;
          const isTodayLessons = card.key === 'todayLessons';
          return (
            <div
              key={card.key}
              className="dash-card"
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => setExpanded(isOpen ? null : card.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpanded(isOpen ? null : card.key);
                }
              }}
              style={{
                background: card.gradient,
                borderRadius: 14,
                padding: '14px 20px',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(0,0,0,0.10)',
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              <div className="dash-card-header">
                <div style={{ fontSize: 30, lineHeight: 1, width: 40, textAlign: 'center', flexShrink: 0 }} aria-hidden="true">
                  {card.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.95, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, textAlign: 'right', flexShrink: 0 }}>
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    opacity: 0.85,
                    marginLeft: 12,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .2s ease',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >⌄</div>
              </div>

              {isOpen && (
                <div
                  className="dash-details dash-scroll"
                  style={{
                    marginTop: 14,
                    background: 'rgba(255,255,255,0.18)',
                    borderRadius: 10,
                    padding: 12,
                    maxHeight: 420,
                    overflowY: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Обычные карточки: items — массив {title, subtitle} */}
                  {!isTodayLessons && (
                    <>
                      {(!card.items || card.items.length === 0) ? (
                        <div style={{ fontSize: 13, opacity: 0.92 }}>
                          {card.emptyText || 'Нет данных'}
                        </div>
                      ) : (
                        card.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '6px 0',
                              borderBottom:
                                idx < card.items.length - 1
                                  ? '1px solid rgba(255,255,255,0.25)'
                                  : 'none',
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                            {item.subtitle && (
                              <div style={{ fontSize: 12, opacity: 0.9 }}>{item.subtitle}</div>
                            )}
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {/* Карточка «Занятий сегодня» — статус + кнопка для planned */}
                  {isTodayLessons && (
                    <>
                      {(!card.items || card.items.length === 0) ? (
                        <div style={{ fontSize: 13, opacity: 0.92 }}>
                          {card.emptyText}
                        </div>
                      ) : (
                        card.items.map((l) => {
                          const state = notifyByLesson[l.id] || {};
                          const isDisabled =
                            state.loading || (state.cooldown ?? 0) > 0;

                          // Кнопка «Уведомить» только для плановых
                          const showNotifyBtn = l.status === 'planned';

                          return (
                            <div key={l.id} className="dash-lesson-row">
                              <div className="dash-lesson-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                                    {formatTime(l.startTime)}–{formatTime(l.endTime)}
                                    {l.groupName ? ` · ${l.groupName}` : ''}
                                  </span>
                                  <StatusBadge status={l.status} />
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                                  {[
                                    l.courseName,
                                    l.teacherName ? `Учитель: ${l.teacherName}` : null,
                                    l.topic,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ') || '—'}
                                </div>

                                {state.message && (
                                  <div
                                    style={{
                                      marginTop: 6,
                                      fontSize: 12,
                                      background: 'rgba(255,255,255,0.25)',
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      display: 'inline-block',
                                    }}
                                  >
                                    ✅ {state.message}
                                  </div>
                                )}
                                {state.error && (
                                  <div
                                    style={{
                                      marginTop: 6,
                                      fontSize: 12,
                                      background: 'rgba(255,255,255,0.25)',
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      display: 'inline-block',
                                    }}
                                  >
                                    ⚠️ {state.error}
                                  </div>
                                )}
                              </div>

                              {showNotifyBtn && (
                                <button
                                  type="button"
                                  className="dash-notify-btn"
                                  disabled={isDisabled}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotifyLesson(l.id);
                                  }}
                                >
                                  {state.loading
                                    ? '⏳ ...'
                                    : (state.cooldown ?? 0) > 0
                                    ? `⏱ ${state.cooldown}с`
                                    : '🔔 Уведомить'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;