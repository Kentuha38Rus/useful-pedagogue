import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from '../../components/common/Button';
import MonthCalendar from '../../components/common/MonthCalendar';
import { substituteLessonTeacher } from '../../store/slices/adminSlice';
import SubstituteTeacherModal from './SubstituteTeacherModal';
import { Field, fullName } from './PersonInfo';

const TeacherDetails = ({
  user,
  loading,
  error,
  onBack,
  teachers = [],
  onSubstituteSaved,
}) => {
  const dispatch = useDispatch();
  const [substitutingLesson, setSubstitutingLesson] = useState(null);
  const [savingSubstitute, setSavingSubstitute] = useState(false);
  const [substituteError, setSubstituteError] = useState('');

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
          groupId: group.id,
          groupName: group.name,
          courseName: group.course ? group.course.name : null,
          groupTeacherId: lesson.groupTeacherId || group.teacherId || null,
          groupTeacherName: lesson.groupTeacherName || fullName(user),
          substituteTeacherId: lesson.substituteTeacherId || null,
          substituteTeacherName: lesson.substituteTeacherName || null,
        });
      });
    });

    // Занятия в чужих группах, где этот преподаватель — замена
    (user?.substituteLessons || []).forEach((lesson) => {
      list.push({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        topic: lesson.topic,
        groupId: lesson.groupId,
        groupName: lesson.groupName,
        courseName: lesson.courseName,
        groupTeacherId: lesson.groupTeacherId,
        groupTeacherName: lesson.groupTeacherName,
        substituteTeacherId: lesson.substituteTeacherId,
        substituteTeacherName: lesson.substituteTeacherName,
      });
    });

    return list;
  }, [user]);

  const handleSaveSubstitute = async (teacherId) => {
    if (!substitutingLesson) return;
    setSavingSubstitute(true);
    setSubstituteError('');
    try {
      await dispatch(
        substituteLessonTeacher({ lessonId: substitutingLesson.id, teacherId })
      ).unwrap();
      setSubstitutingLesson(null);
      if (onSubstituteSaved) onSubstituteSaved();
    } catch (err) {
      setSubstituteError(
        typeof err === 'string'
          ? err
          : err?.message || 'Не удалось назначить преподавателя'
      );
    } finally {
      setSavingSubstitute(false);
    }
  };

  if (loading) {
    return <div className="dash-detail-sub">Загрузка данных учителя...</div>;
  }

  if (error) {
    return (
      <div className="dash-detail">
        <div className="dash-detail-sub" style={{ marginBottom: 10 }}>
          ⚠️ {error}
        </div>
        <Button variant="default" onClick={onBack}>← Назад</Button>
      </div>
    );
  }

  if (!user) {
    return <div className="dash-detail-sub">Нет данных</div>;
  }

  const groups = user.groups || [];

  return (
    <div className="dash-detail">
      <div className="dash-detail-head">
        <div>
          <div className="dash-detail-title">
            {fullName(user)}
            <span className="dash-detail-role">учитель</span>
          </div>
        </div>
        <Button
          variant="default"
          onClick={onBack}
          style={{ padding: '5px 10px', fontSize: 12, flexShrink: 0 }}
        >
          ← Назад к списку
        </Button>
      </div>

      <div className="dash-info-card">
        <div className="dash-fields">
          <Field label="Email" value={user.email} />
          <Field label="Телефон" value={user.phone} />
          <Field
            label="Логин"
            value={user.username || null}
          />
          <Field
            label="Групп"
            value={groups.length === 0 ? 'Нет групп' : groups.length}
          />
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-title" style={{ marginBottom: 8 }}>
          Группы
        </div>
        <div className="dash-info-card">
          {groups.length === 0 ? (
            <div className="dash-list-note">Групп нет</div>
          ) : (
            <ul className="dash-list">
              {groups.map((group) => (
                <li key={group.id}>
                  <strong>{group.name}</strong>
                  {group.course ? ` — ${group.course.name}` : ''}
                  {group.children && group.children.length > 0
                    ? ` · детей: ${group.children.length}`
                    : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-title" style={{ marginBottom: 8 }}>
          Расписание на месяц
        </div>
        <MonthCalendar
          lessons={lessons}
          onSubstitute={(lesson) => {
            setSubstituteError('');
            setSubstitutingLesson(lesson);
          }}
        />
      </div>

      <SubstituteTeacherModal
        isOpen={Boolean(substitutingLesson)}
        lesson={substitutingLesson}
        teachers={teachers}
        saving={savingSubstitute}
        error={substituteError}
        onClose={() => {
          if (!savingSubstitute) setSubstitutingLesson(null);
        }}
        onSave={handleSaveSubstitute}
      />
    </div>
  );
};

export default TeacherDetails;
