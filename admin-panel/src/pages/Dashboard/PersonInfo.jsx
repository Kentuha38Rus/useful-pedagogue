import React from 'react';

export const formatDate = (value) => {
  if (!value) return '—';
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split('-');
  if (!year || !month || !day) return text;
  return `${day}.${month}.${year}`;
};

export const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

export const fullName = (person) => {
  if (!person) return 'Без имени';
  return [person.surname, person.name].filter(Boolean).join(' ') || 'Без имени';
};

// «1 год», «2 года», «5 лет»
export const ageLabel = (age) => {
  const lastTwo = age % 100;
  const last = age % 10;
  let word = 'лет';
  if (lastTwo < 11 || lastTwo > 14) {
    if (last === 1) word = 'год';
    else if (last >= 2 && last <= 4) word = 'года';
  }
  return `${age} ${word}`;
};

// Поле карточки: подпись сверху, значение снизу — ровно и читаемо на телефоне
export const Field = ({ label, value, wide = false }) => {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className={`dash-field${wide ? ' dash-field--wide' : ''}`}>
      <div className="dash-field-label">{label}</div>
      <div
        className={`dash-field-value${
          isEmpty ? ' dash-field-value--empty' : ''
        }`}
      >
        {isEmpty ? '—' : value}
      </div>
    </div>
  );
};
