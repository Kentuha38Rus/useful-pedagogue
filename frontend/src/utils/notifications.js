export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    console.log('Notification permission granted');
  }
};

export const subscribePush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env.VITE_PUSH_PUBLIC_KEY,
    });
    // отправить subscription на сервер
    await fetch(`${import.meta.env.VITE_API_URL}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
  } catch (err) {
    console.error('Push subscribe error:', err);
  }
};

export const onPushMessage = (callback) => {
  // В реальном приложении слушаем сообщения от SW через BroadcastChannel или navigator.serviceWorker
  // Здесь заглушка
  const channel = new BroadcastChannel('push-channel');
  const handler = (event) => {
    callback(event.data);
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
};