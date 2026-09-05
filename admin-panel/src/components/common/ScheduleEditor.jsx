import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';

const DAYS = [
  { value: 'monday', label: 'Понедельник' },
  { value: 'tuesday', label: 'Вторник' },
  { value: 'wednesday', label: 'Среда' },
  { value: 'thursday', label: 'Четверг' },
  { value: 'friday', label: 'Пятница' },
  { value: 'saturday', label: 'Суббота' },
  { value: 'sunday', label: 'Воскресенье' },
];

const ScheduleEditor = ({ value = {}, onChange }) => {
  const [selectedDay, setSelectedDay] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const handleAddSlot = () => {
    if (!selectedDay) return;
    if (startTime >= endTime) {
      alert('Время начала должно быть раньше времени окончания');
      return;
    }
    const newSlot = { start: startTime, end: endTime };
    const currentSlots = value[selectedDay] || [];
    // Проверка на пересечение (можно добавить)
    const updated = {
      ...value,
      [selectedDay]: [...currentSlots, newSlot],
    };
    onChange(updated);
    // Сброс выбора дня, но оставляем время для удобства
    setSelectedDay('');
    setStartTime('09:00');
    setEndTime('10:00');
  };

  const handleRemoveSlot = (day, index) => {
    const updated = { ...value };
    const slots = updated[day] || [];
    slots.splice(index, 1);
    if (slots.length === 0) {
      delete updated[day];
    } else {
      updated[day] = slots;
    }
    onChange(updated);
  };

  const formatTime = (time) => {
    return time.slice(0, 5); // HH:MM
  };

  // Получаем все дни, для которых есть слоты, для упорядоченного вывода
  const daysWithSlots = DAYS.filter(day => value[day.value] && value[day.value].length > 0);

  return (
    <div style={{ marginBottom: '15px' }}>
      <h4>Расписание занятий</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          style={{ padding: '8px', flex: '1 1 150px' }}
        >
          <option value="">Выберите день</option>
          {DAYS.map(day => (
            <option key={day.value} value={day.value}>{day.label}</option>
          ))}
        </select>
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
        <Button variant="primary" size="small" onClick={handleAddSlot} disabled={!selectedDay}>
          Добавить
        </Button>
      </div>

      {daysWithSlots.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>Расписание не задано</p>
      ) : (
        <div>
          {daysWithSlots.map(day => (
            <div key={day.value} style={{ marginBottom: '8px' }}>
              <strong>{day.label}</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {value[day.value].map((slot, index) => (
                  <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{formatTime(slot.start)} – {formatTime(slot.end)}</span>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleRemoveSlot(day.value, index)}
                      style={{ marginLeft: '10px' }}
                    >
                      ✕
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleEditor;