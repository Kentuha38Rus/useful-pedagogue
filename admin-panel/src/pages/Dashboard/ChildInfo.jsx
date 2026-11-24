import React from 'react';
import { ageLabel, calcAge, Field, formatDate } from './PersonInfo';

const ChildInfo = ({ child }) => {
  const age = calcAge(child.birthDate);
  const angles = Array.isArray(child.photoAngles) ? child.photoAngles : [];

  const birthDateValue = child.birthDate
    ? `${formatDate(child.birthDate)}${age !== null ? ` · ${ageLabel(age)}` : ''}`
    : null;

  const photoValue = child.photoConsent
    ? angles.length > 0
      ? `Да · ${angles.join(', ')}`
      : 'Да'
    : 'Нет';

  return (
    <div className="dash-fields">
      <Field label="Дата рождения" value={birthDateValue} />
      <Field label="Разрешение на съёмку" value={photoValue} />
      <Field label="Диагноз" value={child.diagnosis} wide />
      <Field label="Аллергические реакции" value={child.allergies} wide />
      <Field label="Противопоказания" value={child.contraindications} wide />
      <Field label="Дополнительная информация" value={child.extraInfo} wide />
    </div>
  );
};

export default ChildInfo;
