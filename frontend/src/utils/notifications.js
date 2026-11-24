import api from './api';

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
// VAPID-ключ приходит строкой base64url. Safari/iOS требует Uint8Array,
// поэтому конвертируем — иначе подписка работает не во всех браузерах.
// ----------------------------------------------------------------
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
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
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('service-worker-timeout')), 15000)
      ),
    ]);
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
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
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

    // 5. Отправка на бэкенд.
    // Используем общий api-клиент: он сам обновит access-токен при 401.
    const { data: saved } = await api.post('/notifications/subscribe', {
      subscription,
    });

    console.log('[push] subscription saved on server:', {
      id: saved?.id,
      user_id: saved?.user_id,
    });
    return { ok: true, saved };
  } catch (err) {
    console.error('[push] subscribe error:', err);
    return {
      ok: false,
      reason: err?.response?.status
        ? `http-${err.response.status}`
        : err?.message || 'unknown',
    };
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
    const endpoint = subscription ? subscription.endpoint : null;
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[push] unsubscribed locally');
    }
    return { ok: true, endpoint };
  } catch (err) {
    console.warn('[push] unsubscribe error:', err);
    return { ok: false, reason: err?.message };
  }
};

// Удалить подписку на сервере (чтобы уведомления точно перестали приходить)
export const deletePushSubscriptionOnServer = async (endpoint) => {
  try {
    const response = await api.delete('/notifications/subscribe', {
      data: endpoint ? { endpoint } : {},
    });
    return { ok: true, data: response.data };
  } catch (err) {
    console.warn('[push] delete subscription error:', err);
    return {
      ok: false,
      reason: err?.response?.status
        ? `http-${err.response.status}`
        : err?.message,
    };
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
  const response = await api.post(
    `/notifications/lesson-responses/${responseId}/respond`,
    { status }
  );
  return response.data;
};