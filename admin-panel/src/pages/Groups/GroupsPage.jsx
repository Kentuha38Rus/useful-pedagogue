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
import LessonEditor from '../../components/common/LessonEditor';

const GroupsPage = () => {
  const dispatch = useDispatch();
  const { groups, courses, teachers, loading } = useSelector((state) => state.admin);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    teacherId: '',
    maxStudents: 10,
    schedule: '{}',
    lessons: [],
  });

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchCourses());
    dispatch(fetchTeachers());
  }, [dispatch]);

  const handleEdit = (group) => {
    // Преобразуем group.lessons в формат для редактора
    const lessons = group.lessons && Array.isArray(group.lessons)
      ? group.lessons.map(l => ({
          date: l.date,
          startTime: l.startTime,
          endTime: l.endTime,
          topic: l.topic || '',
        }))
      : [];

    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      courseId: group.courseId || '',
      teacherId: group.teacherId || '',
      maxStudents: group.maxStudents || 10,
      schedule: typeof group.schedule === 'string' ? group.schedule : JSON.stringify(group.schedule || {}),
      lessons,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingGroup(null);
    setFormData({ name: '', courseId: '', teacherId: '', maxStudents: 10, schedule: '{}', lessons: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      schedule: formData.schedule,
      lessons: formData.lessons,
    };
    try {
      if (editingGroup) {
        await dispatch(updateGroup({ id: editingGroup.id, groupData: payload })).unwrap();
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

  // Отображение занятий в карточке группы
  const renderLessons = (lessons) => {
    if (!lessons || !Array.isArray(lessons) || lessons.length === 0) return null;
    return (
      <div style={{ marginTop: '10px' }}>
        <strong>Занятия:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          {lessons.map((lesson, idx) => (
            <li key={idx}>
              {new Date(lesson.date + 'T00:00:00').toLocaleDateString('ru-RU')} {lesson.startTime}–{lesson.endTime}
              {lesson.topic && ` (${lesson.topic})`}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Группы</h1>
        <Button
          onClick={() => {
            if (showForm) {
              closeForm();
            } else {
              setEditingGroup(null);
              setFormData({ name: '', courseId: '', teacherId: '', maxStudents: 10, schedule: '{}', lessons: [] });
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <select
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            >
              <option value="">Выберите курс</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            >
              <option value="">Выберите преподавателя</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
            </select>

            <Input
              type="number"
              placeholder="Максимум студентов"
              value={formData.maxStudents}
              onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 10 })}
            />

            <LessonEditor
              value={formData.lessons}
              onChange={(newLessons) => setFormData({ ...formData, lessons: newLessons })}
            />

            <Button type="submit">{editingGroup ? 'Обновить' : 'Сохранить'}</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {groups.map(group => (
            <Card key={group.id} style={{ padding: '15px' }}>
              <h3>{group.name}</h3>
              <p>Курс: {group.course?.name || '—'}</p>
              <p>Учитель: {group.teacher?.name || '—'}</p>
              <p>Студентов: {group.children?.length || 0} / {group.maxStudents}</p>
              {renderLessons(group.lessons)}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Button variant="primary" onClick={() => handleOpenAddChild(group.id)}>
                  Добавить ребенка
                </Button>
                <Button variant="secondary" onClick={() => handleEdit(group)}>
                  Редактировать
                </Button>
                <Button variant="danger" onClick={() => handleDelete(group.id)}>
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