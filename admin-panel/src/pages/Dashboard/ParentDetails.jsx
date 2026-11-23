import React from 'react';
import Button from '../../components/common/Button';
import { ageLabel, calcAge, formatDate, fullName, InfoRow } from './PersonInfo';

const ChildCard = ({ child, onEdit }) => {
  const age = calcAge(child.birthDate);
  const angles = Array.isArray(child.photoAngles) ? child.photoAngles : [];

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.16)',
        border: '1px solid rgba(255,255,255,0.28)',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{fullName(child)}</div>
        <Button
          variant="default"
          onClick={() => onEdit(child)}
          style={{ padding: '4px 10px', fontSize: 12 }}
        >
          Редактировать
        </Button>
      </div>

      <InfoRow
        label="Дата рождения / возраст"
        value={
          child.birthDate
            ? `${formatDate(child.birthDate)}${age !== null ? ` (${ageLabel(age)})` : ''}`
            : '—'
        }
      />
      <InfoRow label="Диагноз" value={child.diagnosis} />
      <InfoRow label="Аллергические реакции" value={child.allergies} />
      <InfoRow label="Противопоказания" value={child.contraindications} />
      <InfoRow
        label="Разрешение на съёмку"
        value={
          child.photoConsent
            ? `Да${angles.length ? ` (${angles.join(', ')})` : ''}`
            : 'Нет'
        }
      />
      <InfoRow label="Дополнительная информация" value={child.extraInfo} />
    </div>
  );
};

const ParentDetails = ({ user, loading, error, onBack, onEditChild, onAddChild }) => {
  if (loading) {
    return <div style={{ fontSize: 13, opacity: 0.92 }}>Загрузка данных родителя...</div>;
  }

  if (error) {
    return (
      <div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>⚠️ {error}</div>
        <Button variant="default" onClick={onBack}>← Назад</Button>
      </div>
    );
  }

  if (!user) {
    return <div style={{ fontSize: 13, opacity: 0.92 }}>Нет данных</div>;
  }

  const children = user.children || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {fullName(user)}
          <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, opacity: 0.85 }}>
            родитель
          </span>
        </div>
        <Button variant="default" onClick={onBack} style={{ padding: '4px 10px', fontSize: 12 }}>
          ← Назад к списку
        </Button>
      </div>

      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Телефон" value={user.phone} />
        <InfoRow label="Логин" value={user.username ? `@${user.username}` : null} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          Дети: {children.length}
        </div>
        <Button onClick={onAddChild} style={{ padding: '4px 10px', fontSize: 12 }}>
          + Добавить ребёнка
        </Button>
      </div>

      {children.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.92 }}>
          У этого родителя ещё нет добавленных детей.
        </div>
      ) : (
        children.map((child) => (
          <ChildCard key={child.id} child={child} onEdit={onEditChild} />
        ))
      )}
    </div>
  );
};

export default ParentDetails;
