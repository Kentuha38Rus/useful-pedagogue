import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import Card from '../../components/common/Card';
import styles from './TeacherGroupsPage.module.scss';

const TeacherGroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [children, setChildren] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups/teacher');
      setGroups(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    setLoading(true);
    try {
      const childrenRes = await api.get(`/groups/${groupId}/children`);
      setChildren(childrenRes.data);
      const lessonsRes = await api.get(`/schedule/group/${groupId}`);
      setLessons(lessonsRes.data);
      setSelectedGroup(groups.find(g => g.id === groupId));

      const initialStatus = {};
      lessonsRes.data.forEach(lesson => {
        const statusMap = {};
        if (lesson.attendances) {
          lesson.attendances.forEach(att => {
            statusMap[att.childId] = att.status;
          });
        }
        initialStatus[lesson.id] = statusMap;
      });
      setAttendanceStatus(initialStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (lessonId, childId, status) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [childId]: status
      }
    }));
  };

  const saveAttendance = async (lessonId) => {
    const statusMap = attendanceStatus[lessonId] || {};
    const attendances = Object.entries(statusMap).map(([childId, status]) => ({
      childId,
      status
    }));
    try {
      await api.patch(`/schedule/lessons/${lessonId}/attendance`, { attendances });
      alert('Посещаемость сохранена');
    } catch (err) {
      console.error(err);
      alert('Ошибка сохранения');
    }
  };

  if (!user || user.role !== 'teacher') {
    return <div>Доступ запрещён</div>;
  }

  return (
    <div className={styles.teacherPage}>
      <h1>Управление группами</h1>
      <div className={styles.groupsList}>
        {groups.map(group => (
          <Card key={group.id} className={styles.groupCard} onClick={() => fetchGroupDetails(group.id)}>
            <h3>{group.name}</h3>
            <p>Курс: {group.course?.name || 'Не указан'}</p>
            <p>Учеников: {group.children?.length || 0}</p>
          </Card>
        ))}
      </div>

      {selectedGroup && (
        <div className={styles.groupDetails}>
          <h2>{selectedGroup.name}</h2>
          <h3>Дети группы:</h3>
          <ul className={styles.childrenList}>
            {children.map(child => (
              <li key={child.id}>{child.name}</li>
            ))}
          </ul>

          <h3>Занятия:</h3>
          {lessons.map(lesson => (
            <Card key={lesson.id} className={styles.lessonCard}>
              <div>
                <strong>{lesson.date} {lesson.startTime}–{lesson.endTime}</strong>
                {lesson.topic && <span> – {lesson.topic}</span>}
              </div>
              <div className={styles.attendanceTable}>
                {children.map(child => (
                  <div key={child.id} className={styles.attendanceRow}>
                    <span>{child.name}</span>
                    <select
                      value={attendanceStatus[lesson.id]?.[child.id] || ''}
                      onChange={(e) => handleStatusChange(lesson.id, child.id, e.target.value)}
                    >
                      <option value="">Не отмечено</option>
                      <option value="present">Присутствовал</option>
                      <option value="absent">Отсутствовал</option>
                      <option value="late">Опоздал</option>
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={() => saveAttendance(lesson.id)} className={styles.saveBtn}>
                Сохранить посещаемость
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherGroupsPage;