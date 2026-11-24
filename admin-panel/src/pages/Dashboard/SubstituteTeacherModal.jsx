import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import { formatDate } from './PersonInfo';

const formatTime = (value) => (value ? String(value).slice(0, 5) : '');

const SubstituteTeacherModal = ({
  isOpen,
  lesson,
  teachers = [],
  saving = false,
  error = '',
  onClose,
  onSave,
}) => {
  const [teacherId, setTeacherId] = useState('');

  useEffect(() => {
    if (!isOpen || !lesson) return;
    setTeacherId(lesson.substituteTeacherId || '');
  }, [isOpen, lesson]);

  if (!isOpen || !lesson) return null;

  const mainTeacherId = lesson.groupTeacherId || '';
  const mainTeacherName = lesson.groupTeacherName || 'основной преподаватель';
  const options = teachers.filter(
    (teacher) => String(teacher.id) !== String(mainTeacherId)
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Замена преподавателя"
      >
        <h3 style={{ marginTop: 0 }}>Замена преподавателя</h3>

        <div style={styles.lessonInfo}>
          <div style={styles.lessonTitle}>
            {lesson.groupName || 'Группа'}
            {lesson.courseName ? ` · ${lesson.courseName}` : ''}
          </div>
          <div style={styles.lessonDate}>
            {formatDate(lesson.date)} · {formatTime(lesson.startTime)}–
            {formatTime(lesson.endTime)}
          </div>
          {lesson.topic && <div style={styles.lessonTopic}>{lesson.topic}</div>}
        </div>

        <label style={styles.label} htmlFor="substituteTeacher">
          Кто проведёт это занятие
        </label>
        <select
          id="substituteTeacher"
          value={teacherId}
          onChange={(event) => setTeacherId(event.target.value)}
          style={styles.select}
          disabled={saving}
        >
          <option value="">{mainTeacherName} (основной)</option>
          {options.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>

        <div style={styles.hint}>
          Замена действует только на выбранную дату. Основной преподаватель и
          расписание группы не меняются.
        </div>

        {error && <div style={styles.error}>⚠️ {error}</div>}

        <div style={styles.actions}>
          <Button variant="default" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button
            onClick={() => onSave(teacherId || null)}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    background: '#fff',
    borderRadius: 10,
    padding: 20,
    boxSizing: 'border-box',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  lessonInfo: {
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 14,
  },
  lessonTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  lessonDate: { fontSize: 13, color: '#334155', marginTop: 3 },
  lessonTopic: { fontSize: 12, color: '#64748b', marginTop: 3 },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4,
  },
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 14,
    marginBottom: 8,
    boxSizing: 'border-box',
  },
  hint: { fontSize: 12, color: '#64748b', lineHeight: 1.45, marginBottom: 12 },
  error: {
    background: '#fee2e2',
    color: '#7f1d1d',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    marginBottom: 12,
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
};

export default SubstituteTeacherModal;
