import React from 'react';
import Button from '../../components/common/Button';
import ChildInfo from './ChildInfo';
import { Field, fullName } from './PersonInfo';

const ChildCard = ({ child, onEdit }) => (
  <div className="dash-info-card">
    <div className="dash-info-head">
      <div>
        <div className="dash-info-title">{fullName(child)}</div>
        {child.birthDate && (
          <div className="dash-info-note">
            {child.groups && child.groups.length > 0
              ? `Групп: ${child.groups.length}`
              : 'Не записан ни в одну группу'}
          </div>
        )}
      </div>
      <Button
        variant="default"
        onClick={() => onEdit(child)}
        style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0 }}
      >
        Редактировать
      </Button>
    </div>
    <ChildInfo child={child} />
  </div>
);

const ParentDetails = ({ user, loading, error, onBack, onEditChild, onAddChild }) => {
  if (loading) {
    return <div className="dash-detail-sub">Загрузка данных родителя...</div>;
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

  if (!user) {
    return <div className="dash-detail-sub">Нет данных</div>;
  }

  const children = user.children || [];

  return (
    <div className="dash-detail">
      <div className="dash-detail-head">
        <div>
          <div className="dash-detail-title">
            {fullName(user)}
            <span className="dash-detail-role">родитель</span>
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
          <Field label="Email" value={user.email} />
          <Field label="Телефон" value={user.phone} />
          <Field
            label="Логин"
            value={user.username ? `@${user.username}` : null}
          />
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-head">
          <div className="dash-section-title">Дети: {children.length}</div>
          <Button
            onClick={onAddChild}
            style={{ padding: '5px 10px', fontSize: 12 }}
          >
            + Добавить ребёнка
          </Button>
        </div>

        {children.length === 0 ? (
          <div className="dash-detail-sub">
            У этого родителя ещё нет добавленных детей.
          </div>
        ) : (
          children.map((child) => (
            <ChildCard key={child.id} child={child} onEdit={onEditChild} />
          ))
        )}
      </div>
    </div>
  );
};

export default ParentDetails;
