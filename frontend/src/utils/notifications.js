// ----------------------------------------------------------------
// Разрешение на показ уведомлений
// ----------------------------------------------------------------
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('[push] Notification API not supported');
    return null;
  }
  const result = await Notification.requestPermission();
  console.log('[push] permission:', result);
  return result;
};

// ----------------------------------------------------------------
// Подписка на push.
// Возвращает { ok: true } при успехе,
// { ok: false, reason } при неудаче.
// ----------------------------------------------------------------
export const subscribePush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[push] Push API not supported');
    return { ok: false, reason: 'push-not-supported' };
  }

  try {
    // 1. Разрешение
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await requestNotificationPermission();
    }
    if (permission !== 'granted') {
      console.warn('[push] permission not granted:', permission);
      return { ok: false, reason: `permission-${permission}` };
    }

    // 2. Service Worker
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      console.warn('[push] no service worker registration');
      return { ok: false, reason: 'no-sw' };
    }

    // 3. VAPID public key
    const vapidKey = import.meta.env.VITE_PUSH_PUBLIC_KEY;
    if (!vapidKey) {
      console.error(
        '[push] VITE_PUSH_PUBLIC_KEY is not set. Check frontend/.env and rebuild.'
      );
      return { ok: false, reason: 'no-vapid-key' };
    }

    // 4. Существующая подписка или создание новой
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[push] creating new subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      console.log(
        '[push] subscription created:',
        subscription.endpoint.slice(0, 60)
      );
    } else {
      console.log(
        '[push] reusing existing subscription:',
        subscription.endpoint.slice(0, 60)
      );
    }

    // 5. Отправка на бэкенд
    const apiUrl =
      import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('[push] no auth token — cannot save subscription');
      return { ok: false, reason: 'no-token' };
    }

    const resp = await fetch(`${apiUrl}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[push] subscribe failed:', resp.status, text);
      return { ok: false, reason: `http-${resp.status}` };
    }

    const saved = await resp.json();
    console.log('[push] subscription saved on server:', {
      id: saved?.id,
      user_id: saved?.user_id,
    });
    return { ok: true, saved };
  } catch (err) {
    console.error('[push] subscribe error:', err);
    return { ok: false, reason: err?.message || 'unknown' };
  }
};

// ----------------------------------------------------------------
// Отписка (для logout или ручного выключения — на будущее)
// ----------------------------------------------------------------
export const unsubscribePush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'push-not-supported' };
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[push] unsubscribed locally');
    }
    return { ok: true };
  } catch (err) {
    console.warn('[push] unsubscribe error:', err);
    return { ok: false, reason: err?.message };
  }
};

// ----------------------------------------------------------------
// Слушатель сообщений из Service Worker (BroadcastChannel)
// ----------------------------------------------------------------
export const onPushMessage = (callback) => {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const channel = new BroadcastChannel('push-channel');
  const handler = (event) => callback(event.data);
  channel.addEventListener('message', handler);
  return () => {
    channel.removeEventListener('message', handler);
    channel.close();
  };
};

// ----------------------------------------------------------------
// Ответ на напоминание из UI (с авторизацией)
// ----------------------------------------------------------------
export const respondToLessonReminder = async (responseId, status) => {
  const apiUrl =
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('token');
  const resp = await fetch(
    `${apiUrl}/notifications/lesson-responses/${responseId}/respond`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    }
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`respond failed: ${resp.status} ${text}`);
  }
  return resp.json();
};