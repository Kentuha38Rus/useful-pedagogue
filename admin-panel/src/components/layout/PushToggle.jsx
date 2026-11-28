import React, { useEffect, useState } from 'react';
import {
  subscribeAdminPush,
  unsubscribeAdminPush,
  deleteAdminPushSubscriptionOnServer,
} from '../../utils/push';

const reasonMessage = (reason) => {
  if (reason === 'permission') {
    return 'Разрешение на уведомления не выдано.';
  }
  if (reason === 'no-vapid-key') {
    return 'Не настроен ключ VAPID для push.';
  }
  if (reason === 'unsupported') {
    return 'Этот браузер не поддерживает push-уведомления.';
  }
  return 'Не удалось включить уведомления. Попробуйте ещё раз.';
};

const PushToggle = () => {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (active) {
          setSupported(false);
          setEnabled(false);
          setChecked(true);
        }
        return;
      }

      try {
        let registration = await navigator.serviceWorker.getRegistration();
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

        if (active) setEnabled(Boolean(subscription) && granted);
      } catch (_) {
        if (active) setEnabled(false);
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
    if (busy || !supported || !checked) return;

    const next = !enabled;
    setBusy(true);
    setError('');

    try {
      if (next) {
        const result = await subscribeAdminPush();
        if (!result.ok) {
          setEnabled(false);
          setError(reasonMessage(result.reason));
          return;
        }
        setEnabled(true);
      } else {
        const result = await unsubscribeAdminPush();
        await deleteAdminPushSubscriptionOnServer(result.endpoint || null);
        setEnabled(false);
      }
    } catch (_) {
      setError('Не удалось изменить настройку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '0 20px 12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Уведомления</div>
          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
            {!checked
              ? 'Проверяем...'
              : enabled
              ? 'Включены'
              : 'Выключены'}
          </div>
        </div>

        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: 44,
            height: 24,
            flexShrink: 0,
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={busy || !checked || !supported}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: busy || !supported ? 'not-allowed' : 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: enabled ? '#22c55e' : '#64748b',
              borderRadius: 24,
              transition: '0.3s',
              opacity: busy || !supported ? 0.6 : 1,
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: 18,
                width: 18,
                left: enabled ? 23 : 3,
                bottom: 3,
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: '0.3s',
              }}
            />
          </span>
        </label>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            lineHeight: 1.35,
            color: '#fecaca',
          }}
        >
          {error}
        </div>
      )}

      {!supported && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            lineHeight: 1.35,
            color: '#cbd5e1',
          }}
        >
          Этот браузер не поддерживает push-уведомления.
        </div>
      )}
    </div>
  );
};

export default PushToggle;
