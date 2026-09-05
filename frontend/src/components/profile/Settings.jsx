import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSettings } from '../../store/slices/authSlice';
import Card from '../common/Card';
import styles from './Settings.module.scss';

const Settings = () => {
  const { settings } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [pushEnabled, setPushEnabled] = useState(settings.pushEnabled);

  const handleToggle = () => {
    const newVal = !pushEnabled;
    setPushEnabled(newVal);
    dispatch(updateSettings({ pushEnabled: newVal }));
  };

  return (
    <Card className={styles.settings}>
      <h3>Настройки уведомлений</h3>
      <div className={styles.item}>
        <span>Push-уведомления</span>
        <label className={styles.switch}>
          <input type="checkbox" checked={pushEnabled} onChange={handleToggle} />
          <span className={styles.slider}></span>
        </label>
      </div>
    </Card>
  );
};

export default Settings;