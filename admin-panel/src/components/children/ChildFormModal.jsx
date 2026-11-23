import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { createChild, updateChild } from '../../store/slices/adminSlice';
import Button from '../common/Button';
import Input from '../common/Input';

// Ракурсы, в которых разрешено снимать ребёнка
export const PHOTO_ANGLES = [
  'Анфас',
  'Профиль',
  'Со спины',
  'В движении',
  'Крупный план',
  'Общий план',
];

const emptyForm = () => ({
  surname: '',
  name: '',
  birthDate: '',
  diagnosis: '',
  allergies: '',
  contraindications: '',
  photoConsent: false,
  photoAngles: [],
  extraInfo: '',
});

const calcAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

// «1 год», «2 года», «5 лет»
const ageLabel = (age) => {
  const lastTwo = age % 100;
  const last = age % 10;
  let word = 'лет';
  if (lastTwo < 11 || lastTwo > 14) {
    if (last === 1) word = 'год';
    else if (last >= 2 && last <= 4) word = 'года';
  }
  return `${age} ${word}`;
};

const todayStr = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
};

const textareaStyle = {
  width: '100%',
  minHeight: '64px',
  padding: '8px',
  marginBottom: '10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '14px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  resize: 'vertical',
};

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: 2 };
const hintStyle = { fontSize: '12px', color: '#64748b', marginTop: -6, marginBottom: 10 };

const ChildFormModal = ({ isOpen, parentId, child, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(child && child.id);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSaving(false);
    if (child) {
      setForm({
        surname: child.surname || '',
        name: child.name || '',
        birthDate: child.birthDate ? String(child.birthDate).slice(0, 10) : '',
        diagnosis: child.diagnosis || '',
        allergies: child.allergies || '',
        contraindications: child.contraindications || '',
        photoConsent: Boolean(child.photoConsent),
        photoAngles: Array.isArray(child.photoAngles) ? child.photoAngles : [],
        extraInfo: child.extraInfo || '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [isOpen, child]);

  const age = useMemo(() => calcAge(form.birthDate), [form.birthDate]);

  if (!isOpen) return null;

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAngle = (angle) => {
    setForm((prev) => {
      const has = prev.photoAngles.includes(angle);
      return {
        ...prev,
        photoAngles: has
          ? prev.photoAngles.filter((a) => a !== angle)
          : [...prev.photoAngles, angle],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Укажите имя ребёнка');
      return;
    }
    if (!form.birthDate) {
      setError('Укажите дату рождения в календаре');
      return;
    }
    if (!form.extraInfo.trim()) {
      setError('Заполните поле «Дополнительная информация»');
      return;
    }
    if (form.photoConsent && form.photoAngles.length === 0) {
      setError('Выберите хотя бы один ракурс для съёмки');
      return;
    }

    const payload = {
      surname: form.surname.trim(),
      name: form.name.trim(),
      birthDate: form.birthDate,
      diagnosis: form.diagnosis.trim(),
      allergies: form.allergies.trim(),
      contraindications: form.contraindications.trim(),
      photoConsent: form.photoConsent,
      photoAngles: form.photoConsent ? form.photoAngles : [],
      extraInfo: form.extraInfo.trim(),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await dispatch(updateChild({ id: child.id, ...payload })).unwrap();
      } else {
        await dispatch(createChild({ ...payload, parentId })).unwrap();
      }
      onSaved && onSaved();
      onClose && onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Не удалось сохранить данные ребёнка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Редактировать ребёнка' : 'Добавить ребёнка'}
      >
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0 }}>
            {isEdit ? 'Редактировать ребёнка' : 'Добавить ребёнка'}
          </h3>

          {error && (
            <div style={{ color: '#b91c1c', marginBottom: 10, fontSize: 13 }}>{error}</div>
          )}

          <label style={labelStyle} htmlFor="childSurname">Фамилия</label>
          <Input
            id="childSurname"
            placeholder="Фамилия ребёнка"
            value={form.surname}
            onChange={(e) => setField('surname', e.target.value)}
          />

          <label style={labelStyle} htmlFor="childName">Имя *</label>
          <Input
            id="childName"
            placeholder="Имя ребёнка"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
          />

          <label style={labelStyle} htmlFor="childBirthDate">Дата рождения *</label>
          <Input
            id="childBirthDate"
            type="date"
            value={form.birthDate}
            max={todayStr()}
            onChange={(e) => setField('birthDate', e.target.value)}
            required
          />
          <div style={hintStyle}>
            {age === null
              ? 'Выберите дату в календаре — возраст посчитается автоматически'
              : `Возраст: ${ageLabel(age)}`}
          </div>

          <label style={labelStyle} htmlFor="childDiagnosis">Диагноз</label>
          <textarea
            id="childDiagnosis"
            style={textareaStyle}
            placeholder="Диагноз ребёнка"
            value={form.diagnosis}
            onChange={(e) => setField('diagnosis', e.target.value)}
          />

          <label style={labelStyle} htmlFor="childAllergies">Аллергические реакции</label>
          <textarea
            id="childAllergies"
            style={textareaStyle}
            placeholder="На что аллергия"
            value={form.allergies}
            onChange={(e) => setField('allergies', e.target.value)}
          />

          <label style={labelStyle} htmlFor="childContraindications">Противопоказания</label>
          <textarea
            id="childContraindications"
            style={textareaStyle}
            placeholder="Что нельзя ребёнку"
            value={form.contraindications}
            onChange={(e) => setField('contraindications', e.target.value)}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.photoConsent}
              onChange={(e) => setField('photoConsent', e.target.checked)}
            />
            Есть разрешение на съёмку
          </label>

          {form.photoConsent && (
            <div style={{ marginBottom: 12, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Можно снимать в ракурсах:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {PHOTO_ANGLES.map((angle) => (
                  <label key={angle} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.photoAngles.includes(angle)}
                      onChange={() => toggleAngle(angle)}
                    />
                    {angle}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label style={labelStyle} htmlFor="childExtraInfo">Дополнительная информация *</label>
          <textarea
            id="childExtraInfo"
            style={{ ...textareaStyle, minHeight: '80px' }}
            placeholder="Всё, что важно знать о ребёнке"
            value={form.extraInfo}
            onChange={(e) => setField('extraInfo', e.target.value)}
            required
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button type="button" variant="default" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
};

export default ChildFormModal;
