import React, { useState } from 'react';
import api from '../../utils/api';
import { getErrorMessage } from '../../utils/errors';
import styles from './Platform.module.scss';

const CreateTenantModal = ({ onClose, onCreated }) => {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/platform/tenants', {
        slug: slug.toLowerCase().trim(),
        name: name.trim(),
        admin: {
          email: adminEmail.toLowerCase().trim(),
          password: adminPassword,
          name: adminName.trim(),
        },
      });
      
      const createdTenant = res.data.tenant;
      
      // Показываем данные для входа, чтобы вы могли их скопировать
      alert(
        `Тенант "${createdTenant.name}" успешно создан!\n\n` +
        `Данные для входа администратора:\n` +
        `URL: http://localhost:3001/login\n` +
        `Email: ${adminEmail}\n` +
        `Пароль: ${adminPassword}\n\n` +
        `Скопируйте это сообщение и отправьте администратору.`
      );

      onCreated(createdTenant);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось создать тенанта'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Новый тенант</div>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Slug (для поддомена)</label>
            <input
              className={styles.fieldInput}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="school1"
              pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Название школы</label>
            <input
              className={styles.fieldInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Школа №1"
              required
            />
          </div>

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #eee' }} />
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Первый администратор школы
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Email (логин)</label>
            <input
              className={styles.fieldInput}
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Имя</label>
            <input
              className={styles.fieldInput}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Пароль (мин. 8 символов)</label>
            <input
              className={styles.fieldInput}
              type="password"
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onClose}
              disabled={submitting}
            >
              Отмена
            </button>
            <button type="submit" className={styles.btn} disabled={submitting}>
              {submitting ? 'Создание...' : 'Создать и выдать доступ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTenantModal;