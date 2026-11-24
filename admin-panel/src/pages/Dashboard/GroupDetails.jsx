import React from 'react';
import Button from '../../components/common/Button';
import StatusBadge from './StatusBadge';
import { Field, formatDate, fullName } from './PersonInfo';

const weekdayShort = (dateStr) => {
  const date = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : '');

const GroupDetails = ({ group, loading, error, onBack }) => {
  if (loading) {
    return <div className="dash-detail-sub">Загрузка данных группы...</div>;
  }

  if (error) {
    return (
      <div className="dash-detail">
        <div className="dash-detail-sub" style={{ marginBottom: 10 }}>
          ⚠️ {error}
        </div>
        <Button variant="default" onClick={onBack}>← Назад</Button>
      </div>
    );
  }

  if (!group) {
    return <div className="dash-detail-sub">Нет данных</div>;
  }

  const children = group.children || [];
  const lessons = group.lessons || [];
  const teacher = group.teacher;

  return (
    <div className="dash-detail">
      <div className="dash-detail-head">
        <div>
          <div className="dash-detail-title">
            {group.name || 'Без названия'}
            <span className="dash-detail-role">группа</span>
          </div>
        </div>
        <Button
          variant="default"
          onClick={onBack}
          style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0 }}
        >
          ← Назад к списку
        </Button>
      </div>

      <div className="dash-info-card">
        <div className="dash-fields">
          <Field label="Курс" value={group.course ? group.course.name : null} />
          <Field
            label="Детей в группе"
            value={`${children.length} из ${group.maxStudents ?? '—'}`}
          />
          <Field label="Преподаватель" value={teacher ? teacher.name : 'Не назначен'} />
          <Field label="Email преподавателя" value={teacher ? teacher.email : null} />
          <Field label="Телефон преподавателя" value={teacher ? teacher.phone : null} />
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-title" style={{ marginBottom: 8 }}>
          Дети в группе
        </div>
        <div className="dash-info-card">
          {children.length === 0 ? (
            <div className="dash-list-note">В группе пока нет детей</div>
          ) : (
            <ul className="dash-list">
              {children.map((child) => (
                <li key={child.id}>
                  {fullName(child)}
                  {child.parent ? ` — родитель: ${child.parent.name}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head">
          <div className="dash-section-title">
            Занятия на этой неделе
          </div>
          <div className="dash-detail-sub">
            {formatDate(group.weekStart)} — {formatDate(group.weekEnd)}
          </div>
        </div>
        <div className="dash-info-card">
          {lessons.length === 0 ? (
            <div className="dash-list-note">На этой неделе занятий нет</div>
          ) : (
            lessons.map((lesson) => (
              <div key={lesson.id} className="dash-week-row">
                <span className="dash-week-date">
                  {formatDate(lesson.date)} · {weekdayShort(lesson.date)}
                </span>
                <span className="dash-week-time">
                  {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
                </span>
                <span className="dash-week-topic">
                  {lesson.topic || 'Без темы'}
                </span>
                <StatusBadge status={lesson.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetails;
