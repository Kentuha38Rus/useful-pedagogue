import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, fetchChildren, removeChildThunk } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ChildProfile from '../../components/profile/ChildProfile';
import Settings from '../../components/profile/Settings';
import styles from './ProfilePage.module.scss';

const ProfilePage = () => {
  const { user, children, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showChildModal, setShowChildModal] = useState(false);
  const [editingChild, setEditingChild] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchChildren());
    }
  }, [dispatch, isAuthenticated]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const openAddChild = () => {
    setEditingChild(null);
    setShowChildModal(true);
  };

  const openEditChild = (child) => {
    setEditingChild(child);
    setShowChildModal(true);
  };

  const handleRemoveChild = async (id) => {
    if (window.confirm('Удалить ребёнка?')) {
      try {
        await dispatch(removeChildThunk(id)).unwrap();
      } catch (err) {
        alert('Не удалось удалить');
      }
    }
  };

  return (
    <div className={styles.profilePage}>
      <Card className={styles.userCard}>
        <h2>{user?.name || 'Пользователь'}</h2>
        <p>{user?.email}</p>
        <Button variant="outline" onClick={handleLogout}>Выйти</Button>
      </Card>

      <Card className={styles.childrenCard}>
        <div className={styles.header}>
          <h3>Мои дети</h3>
          <Button variant="primary" size="small" onClick={openAddChild}>+ Добавить</Button>
        </div>
        {children.length === 0 ? (
          <p>Нет добавленных детей</p>
        ) : (
          children.map(child => (
            <div key={child.id} className={styles.childItem}>
              <div className={styles.childInfo}>
                <span className={styles.childName}>
                  {child.name} {child.birthDate && `(${child.birthDate})`}
                </span>
                {child.group ? (
                  <div className={styles.groupInfo}>
                    <p><strong>Группа:</strong> {child.group.name}</p>
                    {child.group.lessons && child.group.lessons.length > 0 ? (
                      <div className={styles.schedule}>
                        <p><strong>Расписание:</strong></p>
                        <ul>
                          {child.group.lessons.map(lesson => (
                            <li key={lesson.id}>
                              {lesson.date} {lesson.startTime}–{lesson.endTime}
                              {lesson.topic && ` (${lesson.topic})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className={styles.noSchedule}>Расписание не задано</p>
                    )}
                  </div>
                ) : (
                  <p className={styles.noGroup}>Ребёнок не записан в группу</p>
                )}
              </div>
              <div className={styles.actions}>
                <button onClick={() => openEditChild(child)}>✎</button>
                <button onClick={() => handleRemoveChild(child.id)}>✕</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Settings />

      {showChildModal && (
        <ChildProfile
          child={editingChild}
          onClose={() => setShowChildModal(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;