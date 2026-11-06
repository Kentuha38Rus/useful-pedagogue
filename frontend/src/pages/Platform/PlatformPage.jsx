import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import CreateTenantModal from './CreateTenantModal';
import styles from './Platform.module.scss';

const statusClass = (status) => {
  if (status === 'active') return styles.statusActive;
  if (status === 'suspended') return styles.statusSuspended;
  if (status === 'trial') return styles.statusTrial;
  return '';
};

const PlatformPage = () => {
  const { user } = useSelector((s) => s.auth);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/platform/tenants');
      setTenants(res.data.tenants || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось загрузить список тенантов'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleCreated = (tenant) => {
    setTenants((prev) => [tenant, ...prev]);
    setShowCreate(false);
  };

  const toggleStatus = async (tenant) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    if (
      !window.confirm(
        newStatus === 'suspended'
          ? `Заблокировать "${tenant.name}"? Пользователи не смогут войти.`
          : `Разблокировать "${tenant.name}"?`
      )
    )
      return;

    setBusyId(tenant.id);
    try {
      const res = await api.patch(`/platform/tenants/${tenant.id}`, {
        status: newStatus,
      });
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? res.data.tenant : t))
      );
    } catch (err) {
      alert(getErrorMessage(err, 'Не удалось изменить статус'));
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>Платформа: тенанты</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className={styles.userBadge}>{user?.email}</span>
          <button className={styles.btn} onClick={() => setShowCreate(true)}>
            + Создать тенант
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
            className={styles.logoutLink}
          >
            Выйти
          </a>
        </div>
      </div>

      <div className={styles.card}>
        {loading && <div className={styles.empty}>Загрузка...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && tenants.length === 0 && (
          <div className={styles.empty}>
            Пока нет ни одного тенанта. Создайте первый.
          </div>
        )}
        {!loading && tenants.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Slug</th>
                <th>Название</th>
                <th>Статус</th>
                <th>План</th>
                <th>Создан</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <code>{t.slug}</code>
                  </td>
                  <td>{t.name}</td>
                  <td className={statusClass(t.status)}>{t.status}</td>
                  <td>{t.plan}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td className={styles.actions}>
                    <button
                      className={`${styles.btn} ${
                        t.status === 'active' ? styles.btnDanger : ''
                      }`}
                      onClick={() => toggleStatus(t)}
                      disabled={busyId === t.id}
                    >
                      {busyId === t.id
                        ? '...'
                        : t.status === 'active'
                        ? 'Заблокировать'
                        : 'Разблокировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default PlatformPage;