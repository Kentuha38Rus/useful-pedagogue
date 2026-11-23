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

export const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8, fontSize: 13, padding: '2px 0' }}>
    <span style={{ opacity: 0.8, minWidth: 150, flexShrink: 0 }}>{label}</span>
    <span style={{ fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {value === null || value === undefined || value === '' ? '—' : value}
    </span>
  </div>
);
