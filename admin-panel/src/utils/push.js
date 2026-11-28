import api from './api';

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

export const subscribeAdminPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (typeof Notification === 'undefined') {
    return { ok: false, reason: 'unsupported' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission' };
  }

  const vapidKey = import.meta.env.VITE_PUSH_PUBLIC_KEY;
  if (!vapidKey) {
    return { ok: false, reason: 'no-vapid-key' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await api.post('/notifications/subscribe', { subscription });
  return { ok: true };
};

export const unsubscribeAdminPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const endpoint = subscription ? subscription.endpoint : null;
    if (subscription) {
      await subscription.unsubscribe();
    }
    return { ok: true, endpoint };
  } catch (err) {
    return { ok: false, reason: err?.message || 'unsubscribe-failed' };
  }
};

export const deleteAdminPushSubscriptionOnServer = async (endpoint) => {
  try {
    await api.delete('/notifications/subscribe', {
      data: endpoint ? { endpoint } : {},
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err?.response?.status
        ? `http-${err.response.status}`
        : err?.message,
    };
  }
};
