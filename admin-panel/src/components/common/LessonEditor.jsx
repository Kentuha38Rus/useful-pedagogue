import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';

const LessonEditor = ({ value = [], onChange }) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [topic, setTopic] = useState('');

  const handleAddLesson = () => {
    if (!date) {
      alert('Выберите дату занятия');
      return;
    }
    if (startTime >= endTime) {
      alert('Время начала должно быть раньше времени окончания');
      return;
    }
    const newLesson = {
      date,
      startTime,
      endTime,
      topic: topic.trim() || null,
    };
    onChange([...value, newLesson]);
    // Сброс полей (дату оставляем для удобства)
    setStartTime('09:00');
    setEndTime('10:00');
    setTopic('');
  };

  const handleRemoveLesson = (index) => {
    const updated = [...value];
    updated.splice(index, 1);
    onChange(updated);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      <h4>Занятия</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <label>
          Дата:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: '8px', marginLeft: '5px' }}
          />
        </label>
        <label>
          Начало:
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={{ padding: '8px', marginLeft: '5px' }}
          />
        </label>
        <label>
          Окончание:
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={{ padding: '8px', marginLeft: '5px' }}
          />
        </label>
        <Input
          placeholder="Тема (необязательно)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ flex: '1 1 200px' }}
        />
        <Button variant="primary" size="small" onClick={handleAddLesson}>
          Добавить
        </Button>
      </div>

      {value.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>Занятия не добавлены</p>
      ) : (
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          {value.map((lesson, index) => (
            <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <span>
                {formatDate(lesson.date)} {lesson.startTime}–{lesson.endTime}
                {lesson.topic && ` (${lesson.topic})`}
              </span>
              <Button
                variant="danger"
                size="small"
                onClick={() => handleRemoveLesson(index)}
                style={{ marginLeft: '10px' }}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LessonEditor;