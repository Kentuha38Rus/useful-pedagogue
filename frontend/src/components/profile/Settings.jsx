import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSettings } from '../../store/slices/authSlice';
import Card from '../common/Card';
import {
  requestNotificationPermission,
  subscribePush,
  unsubscribePush,
  deletePushSubscriptionOnServer,
} from '../../utils/notifications';
import styles from './Settings.module.scss';

const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iphoneOrIpad = /iphone|ipad|ipod/i.test(ua);
  const ipadOs =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iphoneOrIpad || ipadOs;
};

const getIosVersion = () => {
  if (typeof navigator === 'undefined') return null;
  const match = String(navigator.userAgent).match(/OS (\d+)[_.](\d+)/);
  return match ? `${match[1]}.${match[2]}` : null;
};

const reasonMessage = (reason) => {
  if (!reason) return 'Не удалось включить уведомления.';
  if (reason === 'push-not-supported') {
    return 'Этот браузер не поддерживает push-уведомления.';
  }
  if (reason === 'no-sw') {
    return 'Приложение ещё не готово. Обновите страницу и попробуйте снова.';
  }
  if (reason === 'no-vapid-key') {
    return 'Уведомления не настроены на сервере. Обратитесь к администратору.';
  }
  if (reason === 'no-token') {
    return 'Сессия истекла. Войдите заново.';
  }
  if (String(reason).startsWith('permission-')) {
    return 'Без разрешения браузера включить уведомления нельзя.';
  }
  return 'Не удалось включить уведомления. Попробуйте ещё раз.';
};

const Settings = () => {
  const { settings } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [pushEnabled, setPushEnabled] = useState(
    Boolean(settings.pushEnabled)
  );
  const [supported, setSupported] = useState(true);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ios] = useState(isIosDevice);
  const [iosVersion] = useState(getIosVersion);

  // Реальное состояние берём из браузера, а не только из Redux
  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (active) {
          setSupported(false);
          setPushEnabled(false);
          setChecked(true);
        }
        return;
      }

      try {
        let registration = await navigator.serviceWorker.getRegistration();

        // На первом открытии service worker может ещё регистрироваться
        if (!registration) {
          registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
        }

        const subscription = registration
          ? await registration.pushManager.getSubscription()
          : null;
        const granted =
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted';

        if (active) {
          setPushEnabled(Boolean(subscription) && granted);
        }
      } catch (err) {
        if (active) setPushEnabled(false);
      } finally {
        if (active) setChecked(true);
      }
    };

    sync();
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = async () => {
    if (busy || !supported) return;

    const next = !pushEnabled;
    setBusy(true);
    setError('');

    try {
      if (next) {
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
          setPushEnabled(false);
          dispatch(updateSettings({ pushEnabled: false }));
          setError(
            permission === 'denied'
              ? 'Уведомления запрещены в настройках браузера для этого сайта.'
              : 'Без разрешения браузера включить уведомления нельзя.'
          );
          return;
        }

        const result = await subscribePush();
        if (!result.ok) {
          setPushEnabled(false);
          dispatch(updateSettings({ pushEnabled: false }));
          setError(reasonMessage(result.reason));
          return;
        }

        setPushEnabled(true);
        dispatch(updateSettings({ pushEnabled: true }));
      } else {
        const result = await unsubscribePush();
        await deletePushSubscriptionOnServer(result.endpoint || null);
        setPushEnabled(false);
        dispatch(updateSettings({ pushEnabled: false }));
      }
    } catch (err) {
      setError('Не удалось изменить настройку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={styles.settings}>
      <h3>Настройки уведомлений</h3>

      <div className={styles.item}>
        <div className={styles.text}>
          <span>Push-уведомления</span>
          <span className={styles.status}>
            {!checked
              ? 'Проверяем...'
              : pushEnabled
              ? 'Включены'
              : 'Выключены'}
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={handleToggle}
            disabled={busy || !supported || !checked}
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      {error && <div className={styles.error}>⚠️ {error}</div>}

      {!supported && (
        <div className={styles.hint}>
          {ios ? (
            <>
              Push-уведомления на iPhone работают только в приложении,
              добавленном на экран «Домой», и начиная с <strong>iOS 16.4</strong>.
              {iosVersion ? ` На этом устройстве iOS ${iosVersion}.` : ''}{' '}
              Если обновление iOS недоступно, включить push на этом телефоне
              нельзя — сообщения будут приходить в чат, пока приложение
              открыто.
            </>
          ) : (
            'Этот браузер не поддерживает push-уведомления. Откройте личный кабинет в Chrome, Edge или Safari.'
          )}
        </div>
      )}

      {supported && ios && (
        <div className={styles.hint}>
          На iPhone уведомления работают в приложении с экрана «Домой».
          Если ползунок не включается — проверьте, что приложение добавлено на
          экран «Домой», и разрешите уведомления в настройках iOS.
        </div>
      )}
    </Card>
  );
};

export default Settings;
