import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStats,
  fetchUserDetails,
  fetchChildDetails,
  fetchGroupDetails,
} from '../../store/slices/adminSlice';
import ChildFormModal from '../../components/children/ChildFormModal';
import ParentDetails from './ParentDetails';
import TeacherDetails from './TeacherDetails';
import ChildDetails from './ChildDetails';
import GroupDetails from './GroupDetails';
import StatusBadge from './StatusBadge';
import api from '../../utils/api';
import './dashboard.css';

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

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { stats, loading, error, userDetails, childDetails, groupDetails } =
    useSelector((state) => state.admin);

  const [expanded, setExpanded] = useState(null);

  // Раскрытая карточка в дашборде: родитель, учитель, ребёнок или группа
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [childModal, setChildModal] = useState({ isOpen: false, child: null });

  // Раскрытое занятие и уведомления отдельным участникам
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [notifyByPerson, setNotifyByPerson] = useState({});

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

  const toggleCard = (key) => {
    const next = expanded === key ? null : key;
    setExpanded(next);
    if (next !== 'parents') setSelectedParentId(null);
    if (next !== 'teachers') setSelectedTeacherId(null);
    if (next !== 'children') setSelectedChildId(null);
    if (next !== 'groups') setSelectedGroupId(null);
    setExpandedLessonId(null);
  };

  const openPerson = (role, id) => {
    if (role === 'parent') {
      setSelectedParentId(id);
      setSelectedTeacherId(null);
    } else {
      setSelectedTeacherId(id);
      setSelectedParentId(null);
    }
    dispatch(fetchUserDetails(id));
  };

  const openChild = (id) => {
    setSelectedChildId(id);
    dispatch(fetchChildDetails(id));
  };

  const openGroup = (id) => {
    setSelectedGroupId(id);
    dispatch(fetchGroupDetails({ groupId: id, date: getLocalDateString() }));
  };

  const closePerson = (role) => {
    if (role === 'parent') setSelectedParentId(null);
    else setSelectedTeacherId(null);
  };

  const handleEditChild = (child) => {
    setChildModal({ isOpen: true, child });
  };

  const handleAddChild = () => {
    setChildModal({ isOpen: true, child: null });
  };

  const handleChildSaved = () => {
    if (selectedParentId) dispatch(fetchUserDetails(selectedParentId));
    if (selectedChildId) dispatch(fetchChildDetails(selectedChildId));
    dispatch(fetchStats({ date: getLocalDateString() }));
  };

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

  const personKey = (lessonId, type, id) => `${lessonId}:${type}:${id}`;

  const handleNotifyPerson = async (lessonId, type, id) => {
    const key = personKey(lessonId, type, id);
    if (notifyByPerson[key]?.loading) return;

    setNotifyByPerson((prev) => ({
      ...prev,
      [key]: { loading: true, message: '', error: '' },
    }));

    try {
      const payload = type === 'teacher' ? { teacherId: id } : { childId: id };
      const res = await api.post(
        `/notifications/lesson-reminders/lesson/${lessonId}/target`,
        payload
      );
      setNotifyByPerson((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          message: res.data.message || 'Уведомление отправлено',
          error: '',
        },
      }));
    } catch (e) {
      setNotifyByPerson((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          message: '',
          error: e.response?.data?.error || 'Не удалось отправить',
        },
      }));
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
        id: t.id,
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
        id: p.id,
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
        id: c.id,
        title: [c.surname, c.name].filter(Boolean).join(' ') || 'Без имени',
        subtitle: [
          `Родитель: ${c.parent ? c.parent.name : 'не указан'}`,
          c.birthDate ? `дата рождения: ${formatDate(c.birthDate)}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
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
        id: g.id,
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
        id: c.id,
        title: [c.surname, c.name].filter(Boolean).join(' ') || 'Без имени',
        subtitle: [
          `Родитель: ${c.parent ? c.parent.name : 'не указан'}`,
          c.birthDate ? `дата рождения: ${formatDate(c.birthDate)}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
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
        .dash-lesson-row { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.25); }
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
        .dash-person-row:hover { background: rgba(255,255,255,0.14); }
        .dash-person-row:focus-visible { outline: 2px solid rgba(255,255,255,0.85); outline-offset: 1px; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Дашборд</h1>
        <div style={{ color: '#888', fontSize: 14 }}>Данные на {formatDate(stats.today)}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {cards.map((card) => {
          const isOpen = expanded === card.key;
          const isTodayLessons = card.key === 'todayLessons';
          const personRole =
            card.key === 'parents'
              ? 'parent'
              : card.key === 'teachers'
              ? 'teacher'
              : null;
          const selectedId =
            personRole === 'parent'
              ? selectedParentId
              : personRole === 'teacher'
              ? selectedTeacherId
              : null;
          const personUser =
            personRole && selectedId && userDetails.user?.id === selectedId
              ? userDetails.user
              : null;
          const personLoading = Boolean(
            personRole && selectedId && userDetails.loading
          );
          const isChildrenCard = card.key === 'children';
          const isGroupsCard = card.key === 'groups';

          const childUser =
            isChildrenCard &&
            selectedChildId &&
            childDetails.child?.id === selectedChildId
              ? childDetails.child
              : null;
          const childLoading = Boolean(
            isChildrenCard && selectedChildId && childDetails.loading
          );
          const groupUser =
            isGroupsCard &&
            selectedGroupId &&
            groupDetails.group?.id === selectedGroupId
              ? groupDetails.group
              : null;
          const groupLoading = Boolean(
            isGroupsCard && selectedGroupId && groupDetails.loading
          );

          const hasDetails = Boolean(
            (personRole && selectedId) ||
              (isChildrenCard && selectedChildId) ||
              (isGroupsCard && selectedGroupId)
          );

          return (
            <div
              key={card.key}
              className="dash-card"
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => toggleCard(card.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleCard(card.key);
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
                <div className="dash-card-value" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, textAlign: 'right', flexShrink: 0 }}>
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
                    maxHeight: '70vh',
                    overflowY: 'auto',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Раскрытая карточка конкретного родителя / учителя */}
                  {personRole && selectedId && (
                    personRole === 'parent' ? (
                      <ParentDetails
                        user={personUser}
                        loading={personLoading}
                        error={personUser ? null : userDetails.error}
                        onBack={() => closePerson('parent')}
                        onEditChild={handleEditChild}
                        onAddChild={handleAddChild}
                      />
                    ) : (
                      <TeacherDetails
                        user={personUser}
                        loading={personLoading}
                        error={personUser ? null : userDetails.error}
                        onBack={() => closePerson('teacher')}
                        teachers={details.teachers || []}
                        onSubstituteSaved={() => {
                          if (selectedTeacherId) {
                            dispatch(fetchUserDetails(selectedTeacherId));
                          }
                          dispatch(
                            fetchStats({ date: getLocalDateString() })
                          );
                        }}
                      />
                    )
                  )}

                  {/* Раскрытая карточка ребёнка */}
                  {isChildrenCard && selectedChildId && (
                    <ChildDetails
                      child={childUser}
                      loading={childLoading}
                      error={childUser ? null : childDetails.error}
                      onBack={() => setSelectedChildId(null)}
                    />
                  )}

                  {/* Раскрытая карточка группы */}
                  {isGroupsCard && selectedGroupId && (
                    <GroupDetails
                      group={groupUser}
                      loading={groupLoading}
                      error={groupUser ? null : groupDetails.error}
                      onBack={() => setSelectedGroupId(null)}
                    />
                  )}

                  {/* Обычные карточки: items — массив {title, subtitle} */}
                  {!isTodayLessons && !hasDetails && (
                    <>
                      {(!card.items || card.items.length === 0) ? (
                        <div style={{ fontSize: 13, opacity: 0.92 }}>
                          {card.emptyText || 'Нет данных'}
                        </div>
                      ) : (
                        <>
                          {(personRole || isChildrenCard || isGroupsCard) && (
                            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                              Нажмите на запись, чтобы открыть карточку
                            </div>
                          )}
                          {card.items.map((item, idx) => {
                            const clickable = Boolean(
                              personRole || isChildrenCard || isGroupsCard
                            );
                            const openItem = () => {
                              if (personRole) openPerson(personRole, item.id);
                              else if (isChildrenCard) openChild(item.id);
                              else if (isGroupsCard) openGroup(item.id);
                            };
                            return (
                              <div
                                key={item.id || idx}
                                className={clickable ? 'dash-person-row' : undefined}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                onClick={clickable ? openItem : undefined}
                                onKeyDown={
                                  clickable
                                    ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          openItem();
                                        }
                                      }
                                    : undefined
                                }
                                style={{
                                  padding: '6px 4px',
                                  borderRadius: 6,
                                  cursor: clickable ? 'pointer' : 'default',
                                  borderBottom:
                                    idx < card.items.length - 1
                                      ? '1px solid rgba(255,255,255,0.25)'
                                      : 'none',
                                }}
                              >
                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                  {item.title}
                                  {clickable && (
                                    <span style={{ opacity: 0.75, marginLeft: 6 }}>›</span>
                                  )}
                                </div>
                                {item.subtitle && (
                                  <div style={{ fontSize: 12, opacity: 0.9 }}>{item.subtitle}</div>
                                )}
                              </div>
                            );
                          })}
                        </>
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
                          const showNotifyBtn = l.status === 'planned';
                          const isExpanded = expandedLessonId === l.id;
                          const participants = l.participants || {
                            teacher: null,
                            children: [],
                          };
                          const peopleCount =
                            (participants.teacher ? 1 : 0) +
                            participants.children.length;

                          return (
                            <div key={l.id} className="dash-lesson-row">
                              <div
                                className="dash-lesson-main"
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  setExpandedLessonId(isExpanded ? null : l.id)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setExpandedLessonId(isExpanded ? null : l.id);
                                  }
                                }}
                              >
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
                                      l.teacherName
                                        ? `${l.isSubstituted ? 'Замена' : 'Учитель'}: ${
                                            l.teacherName
                                          }`
                                        : null,
                                      l.topic,
                                    ]
                                      .filter(Boolean)
                                      .join(' • ') || '—'}
                                  </div>
                                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                                    Участников: {peopleCount}
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
                                      : '🔔 Уведомить всех'}
                                  </button>
                                )}

                                <span
                                  className={`dash-lesson-chevron${
                                    isExpanded ? ' dash-lesson-chevron--open' : ''
                                  }`}
                                  aria-hidden="true"
                                >
                                  ⌄
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="dash-participants">
                                  {participants.teacher ? (
                                    <div className="dash-participant">
                                      <span className="dash-participant-role">
                                        преподаватель
                                      </span>
                                      <span className="dash-participant-name">
                                        {participants.teacher.name || 'Без имени'}
                                      </span>
                                      {showNotifyBtn && (
                                        <button
                                          type="button"
                                          className="dash-participant-btn"
                                          disabled={
                                            notifyByPerson[
                                              personKey(
                                                l.id,
                                                'teacher',
                                                participants.teacher.id
                                              )
                                            ]?.loading
                                          }
                                          onClick={() =>
                                            handleNotifyPerson(
                                              l.id,
                                              'teacher',
                                              participants.teacher.id
                                            )
                                          }
                                        >
                                          {notifyByPerson[
                                            personKey(
                                              l.id,
                                              'teacher',
                                              participants.teacher.id
                                            )
                                          ]?.loading
                                            ? '⏳'
                                            : '🔔 Уведомить'}
                                        </button>
                                      )}
                                      {notifyByPerson[
                                        personKey(
                                          l.id,
                                          'teacher',
                                          participants.teacher.id
                                        )
                                      ]?.message && (
                                        <div className="dash-participant-msg">
                                          ✅{' '}
                                          {
                                            notifyByPerson[
                                              personKey(
                                                l.id,
                                                'teacher',
                                                participants.teacher.id
                                              )
                                            ].message
                                          }
                                        </div>
                                      )}
                                      {notifyByPerson[
                                        personKey(
                                          l.id,
                                          'teacher',
                                          participants.teacher.id
                                        )
                                      ]?.error && (
                                        <div className="dash-participant-msg dash-participant-msg--error">
                                          ⚠️{' '}
                                          {
                                            notifyByPerson[
                                              personKey(
                                                l.id,
                                                'teacher',
                                                participants.teacher.id
                                              )
                                            ].error
                                          }
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="dash-participant">
                                      <span className="dash-participant-role">
                                        преподаватель
                                      </span>
                                      <span className="dash-participant-parent">
                                        не назначен
                                      </span>
                                    </div>
                                  )}

                                  {participants.children.length === 0 ? (
                                    <div className="dash-participant">
                                      <span className="dash-participant-parent">
                                        В группе нет детей
                                      </span>
                                    </div>
                                  ) : (
                                    participants.children.map((child) => {
                                      const key = personKey(l.id, 'child', child.id);
                                      const personState = notifyByPerson[key] || {};
                                      return (
                                        <div key={child.id} className="dash-participant">
                                          <span className="dash-participant-name">
                                            {child.name}
                                          </span>
                                          <span className="dash-participant-parent">
                                            {child.parentName
                                              ? `родитель: ${child.parentName}`
                                              : 'родитель не указан'}
                                          </span>
                                          {showNotifyBtn && (
                                            <button
                                              type="button"
                                              className="dash-participant-btn"
                                              disabled={personState.loading}
                                              onClick={() =>
                                                handleNotifyPerson(
                                                  l.id,
                                                  'child',
                                                  child.id
                                                )
                                              }
                                            >
                                              {personState.loading
                                                ? '⏳'
                                                : '🔔 Уведомить'}
                                            </button>
                                          )}
                                          {personState.message && (
                                            <div className="dash-participant-msg">
                                              ✅ {personState.message}
                                            </div>
                                          )}
                                          {personState.error && (
                                            <div className="dash-participant-msg dash-participant-msg--error">
                                              ⚠️ {personState.error}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
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

      <ChildFormModal
        isOpen={childModal.isOpen}
        parentId={selectedParentId}
        child={childModal.child}
        onClose={() => setChildModal({ isOpen: false, child: null })}
        onSaved={handleChildSaved}
      />
    </div>
  );
};

export default DashboardPage;