import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, fetchChildren } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InstallApp from '../../components/profile/InstallApp';
import Settings from '../../components/profile/Settings';
import styles from './ProfilePage.module.scss';

const ProfilePage = () => {
  const { user, children, isAuthenticated } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchChildren());
    }
  }, [dispatch, isAuthenticated]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
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
          <span className={styles.hint}>
            Данные детей заполняет администратор школы
          </span>
        </div>

        {children.length === 0 ? (
          <p>Нет добавленных детей</p>
        ) : (
          children.map((child) => {
            const groups = child.groups || [];
            return (
              <div key={child.id} className={styles.childItem}>
                <div className={styles.childInfo}>
                  <span className={styles.childName}>
                    {[child.surname, child.name].filter(Boolean).join(' ')}
                    {child.birthDate ? ` (${child.birthDate})` : ''}
                  </span>

                  {groups.length === 0 ? (
                    <p className={styles.noGroup}>
                      Ребёнок не записан ни в одну группу
                    </p>
                  ) : (
                    <div className={styles.groupInfo}>
                      <p>
                        <strong>Группы:</strong>{' '}
                        {groups.map((group) => group.name).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      <InstallApp />
      <Settings />
    </div>
  );
};

export default ProfilePage;
