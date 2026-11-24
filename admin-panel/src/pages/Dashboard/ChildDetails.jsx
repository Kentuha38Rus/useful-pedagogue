import React from 'react';
import Button from '../../components/common/Button';
import ChildInfo from './ChildInfo';
import { Field, fullName } from './PersonInfo';

const ChildDetails = ({ child, loading, error, onBack }) => {
  if (loading) {
    return <div className="dash-detail-sub">Загрузка данных ребёнка...</div>;
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

  if (!child) {
    return <div className="dash-detail-sub">Нет данных</div>;
  }

  const parent = child.parent;
  const groups = child.groups || [];

  return (
    <div className="dash-detail">
      <div className="dash-detail-head">
        <div>
          <div className="dash-detail-title">
            {fullName(child)}
            <span className="dash-detail-role">ребёнок</span>
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
        <ChildInfo child={child} />
      </div>

      <div className="dash-section">
        <div className="dash-section-title" style={{ marginBottom: 8 }}>
          Родитель
        </div>
        <div className="dash-info-card">
          {parent ? (
            <div className="dash-fields">
              <Field label="Имя" value={parent.name} />
              <Field label="Email" value={parent.email} />
              <Field label="Телефон" value={parent.phone} />
              <Field
                label="Логин"
                value={parent.username ? `@${parent.username}` : null}
              />
            </div>
          ) : (
            <div className="dash-list-note">Родитель не указан</div>
          )}
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-title" style={{ marginBottom: 8 }}>
          Группы
        </div>
        <div className="dash-info-card">
          {groups.length === 0 ? (
            <div className="dash-list-note">Ребёнок не записан ни в одну группу</div>
          ) : (
            <ul className="dash-list">
              {groups.map((group) => {
                const details = [
                  group.course ? group.course.name : null,
                  group.teacher ? `преподаватель: ${group.teacher.name}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={group.id}>
                    <strong>{group.name}</strong>
                    {details ? ` — ${details}` : ''}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildDetails;
