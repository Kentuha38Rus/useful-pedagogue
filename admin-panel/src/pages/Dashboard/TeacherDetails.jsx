import React, { useMemo } from 'react';
import Button from '../../components/common/Button';
import MonthCalendar from '../../components/common/MonthCalendar';
import { fullName, InfoRow } from './PersonInfo';

const TeacherDetails = ({ user, loading, error, onBack }) => {
  const lessons = useMemo(() => {
    const list = [];
    (user?.groups || []).forEach((group) => {
      (group.lessons || []).forEach((lesson) => {
        if (lesson.is_cancelled) return;
        list.push({
          id: lesson.id,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          topic: lesson.topic,
          groupName: group.name,
          courseName: group.course ? group.course.name : null,
        });
      });
    });
    return list;
  }, [user]);

  if (loading) {
    return <div style={{ fontSize: 13, opacity: 0.92 }}>Загрузка данных учителя...</div>;
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

  const groups = user.groups || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {fullName(user)}
          <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, opacity: 0.85 }}>
            учитель
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
        <InfoRow
          label="Группы"
          value={
            groups.length === 0
              ? 'Групп нет'
              : groups
                  .map((group) => {
                    const course = group.course ? ` (${group.course.name})` : '';
                    return `${group.name}${course}`;
                  })
                  .join(', ')
          }
        />
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        Расписание на месяц
      </div>
      <MonthCalendar lessons={lessons} loading={false} />
    </div>
  );
};

export default TeacherDetails;
