import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  fetchCourses,
  fetchTeachers,
} from '../../store/slices/adminSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import AddChildModal from '../../components/common/AddChildModal';

// Порядок дней как в JS getDay()
const DAYS = [
  { key: 'monday',    label: 'Понедельник' },
  { key: 'tuesday',   label: 'Вторник' },
  { key: 'wednesday', label: 'Среда' },
  { key: 'thursday',  label: 'Четверг' },
  { key: 'friday',    label: 'Пятница' },
  { key: 'saturday',  label: 'Суббота' },
  { key: 'sunday',    label: 'Воскресенье' },
];

const emptySchedule = () => {
  const obj = {};
  DAYS.forEach((d) => (obj[d.key] = null));
  return obj;
};

const pad2 = (n) => String(n).padStart(2, '0');

const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const formatDayTime = (start, end) => {
  const s = String(start || '').slice(0, 5);
  const e = String(end || '').slice(0, 5);
  return `${s}–${e}`;
};

const formatDateRu = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  });
};

/**
 * Список занятий группы:
 *   - всегда показывает сегодня и завтра;
 *   - остальные будущие — под раскрывающимся списком;
 *   - прошедшие не показываются.
 */
const GroupLessonsList = ({ lessons }) => {
  const [expandedFar, setExpandedFar] = useState(false);

  if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
    return null;
  }

  const now = new Date();
  const todayStr = toLocalDateStr(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toLocalDateStr(tomorrow);

  // Только сегодня и в будущем
  const upcoming = lessons
    .filter((l) => l.date >= todayStr)
    .slice()
    .sort((a, b) =>
      `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
    );

  if (upcoming.length === 0) {
    return (
      <div style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>
        Ближайших занятий нет
      </div>
    );
  }

  const nearLessons = upcoming.filter((l) => l.date <= tomorrowStr);
  const farLessons = upcoming.filter((l) => l.date > tomorrowStr);

  const renderItem = (lesson, idx) => (
    <li key={`${lesson.id || idx}-${lesson.date}-${lesson.startTime}`}>
      <strong>{formatDateRu(lesson.date)}</strong>{' '}
      {formatDayTime(lesson.startTime, lesson.endTime)}
      {lesson.topic && ` (${lesson.topic})`}
    </li>
  );

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        Занятия (сегодня и завтра):
      </div>

      {nearLessons.length === 0 ? (
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          На сегодня и завтра занятий нет.
        </div>
      ) : (
        <ul style={{ margin: '4px 0 8px', paddingLeft: 20 }}>
          {nearLessons.map(renderItem)}
        </ul>
      )}

      {farLessons.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpandedFar((v) => !v)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#2563eb',
              cursor: 'pointer',
              padding: 0,
              fontSize: 13,
              textDecoration: 'underline',
            }}
          >
            {expandedFar
              ? 'Скрыть будущие занятия'
              : `Показать все будущие занятия (${farLessons.length})`}
          </button>

          {expandedFar && (
            <ul
              style={{
                margin: '6px 0 0',
                paddingLeft: 20,
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {farLessons.map(renderItem)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const GroupsPage = () => {
  const dispatch = useDispatch();
  const { groups, courses, teachers, loading } = useSelector(
    (state) => state.admin
  );
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    teacherId: '',
    maxStudents: 10,
    schedule: emptySchedule(),
  });

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchCourses());
    dispatch(fetchTeachers());
  }, [dispatch]);

  const parseScheduleFromGroup = (raw) => {
    const result = emptySchedule();
    if (!raw) return result;
    let obj = raw;
    if (typeof raw === 'string') {
      try {
        obj = JSON.parse(raw);
      } catch {
        return result;
      }
    }
    if (!obj || typeof obj !== 'object') return result;

    for (const d of DAYS) {
      const value = obj[d.key];
      if (!value) continue;
      const first = Array.isArray(value) ? value[0] : value;
      const m = String(first).match(/^\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
      if (m) {
        result[d.key] = { start: m[1], end: m[2] };
      }
    }
    return result;
  };

  const buildSchedulePayload = (scheduleObj) => {
    const result = {};
    for (const d of DAYS) {
      const val = scheduleObj[d.key];
      if (val && val.start && val.end) {
        result[d.key] = `${val.start}-${val.end}`;
      }
    }
    return Object.keys(result).length ? result : null;
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      courseId: group.courseId || '',
      teacherId: group.teacherId || '',
      maxStudents: group.maxStudents || 10,
      schedule: parseScheduleFromGroup(group.schedule),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingGroup(null);
    setFormData({
      name: '',
      courseId: '',
      teacherId: '',
      maxStudents: 10,
      schedule: emptySchedule(),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      courseId: formData.courseId,
      teacherId: formData.teacherId,
      maxStudents: formData.maxStudents,
      schedule: buildSchedulePayload(formData.schedule),
    };
    try {
      if (editingGroup) {
        await dispatch(
          updateGroup({ id: editingGroup.id, groupData: payload })
        ).unwrap();
      } else {
        await dispatch(createGroup(payload)).unwrap();
      }
      closeForm();
      dispatch(fetchGroups());
    } catch (error) {
      console.error('Ошибка сохранения группы:', error);
      alert('Не удалось сохранить группу');
    }
  };

  const handleDelete = (id) => {
    if (confirm('Удалить группу?')) dispatch(deleteGroup(id));
  };

  const handleOpenAddChild = (groupId) => {
    setSelectedGroupId(groupId);
    setShowAddChildModal(true);
  };

  const handleChildAdded = () => {
    dispatch(fetchGroups());
  };

  const setDaySlot = (day, value) => {
    setFormData((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [day]: value },
    }));
  };

  const toggleDay = (day) => {
    setFormData((prev) => {
      const current = prev.schedule[day];
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: current ? null : { start: '10:00', end: '11:00' },
        },
      };
    });
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1>Группы</h1>
        <Button
          type="button"
          onClick={() => {
            if (showForm) closeForm();
            else {
              setEditingGroup(null);
              setFormData({
                name: '',
                courseId: '',
                teacherId: '',
                maxStudents: 10,
                schedule: emptySchedule(),
              });
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Отмена' : '+ Создать группу'}
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: '20px', padding: '20px' }}>
          <form onSubmit={handleSubmit}>
            <h3>{editingGroup ? 'Редактировать группу' : 'Создать группу'}</h3>

            <Input
              placeholder="Название группы"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />

            <select
              value={formData.courseId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, courseId: e.target.value }))
              }
              required
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            >
              <option value="">Выберите курс</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={formData.teacherId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, teacherId: e.target.value }))
              }
              required
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            >
              <option value="">Выберите преподавателя</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>

            <Input
              type="number"
              placeholder="Максимум студентов"
              value={formData.maxStudents}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxStudents: parseInt(e.target.value) || 10,
                }))
              }
            />

            {/* Редактор недельного шаблона */}
            <div style={{ margin: '16px 0', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Расписание на неделю
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                Занятия будут созданы автоматически на 4 недели вперёд и продлеваться каждую ночь.
              </div>

              {DAYS.map((d) => {
                const slot = formData.schedule[d.key];
                return (
                  <div
                    key={d.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 0',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <label style={{ minWidth: 140, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!slot}
                        onChange={() => toggleDay(d.key)}
                        style={{ marginRight: 8 }}
                      />
                      {d.label}
                    </label>
                    {slot && (
                      <>
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            setDaySlot(d.key, { ...slot, start: e.target.value })
                          }
                          style={{ padding: 4, borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                        <span>—</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            setDaySlot(d.key, { ...slot, end: e.target.value })
                          }
                          style={{ padding: 4, borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <Button type="submit">
              {editingGroup ? 'Обновить' : 'Сохранить'}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {groups.map((group) => (
            <Card key={group.id} style={{ padding: '15px' }}>
              <h3>{group.name}</h3>
              <p>Курс: {group.course?.name || '—'}</p>
              <p>Учитель: {group.teacher?.name || '—'}</p>
              <p>
                Студентов: {group.children?.length || 0} / {group.maxStudents}
              </p>
              <GroupLessonsList lessons={group.lessons} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleOpenAddChild(group.id)}
                >
                  Добавить ребенка
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleEdit(group)}
                >
                  Редактировать
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleDelete(group.id)}
                >
                  Удалить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddChildModal
        isOpen={showAddChildModal}
        onClose={() => setShowAddChildModal(false)}
        groupId={selectedGroupId}
        onChildAdded={handleChildAdded}
      />
    </div>
  );
};

export default GroupsPage;