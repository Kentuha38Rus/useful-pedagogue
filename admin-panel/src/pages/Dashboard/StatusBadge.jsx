import React from 'react';

export const STATUS_META = {
  planned: { label: 'Запланировано', icon: '🕒' },
  done: { label: 'Проведено', icon: '✅' },
  no_mark: { label: 'Без отметки', icon: '⚠️' },
  cancelled: { label: 'Отменено', icon: '🚫' },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return (
    <span className={`dash-status dash-status--${status || 'planned'}`}>
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
};

export default StatusBadge;
