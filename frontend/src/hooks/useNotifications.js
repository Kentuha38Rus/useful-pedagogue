import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { subscribePush, onPushMessage } from '../utils/notifications';
import { getSocket } from '../utils/socket';

const useNotifications = () => {
  const { settings, user } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const pushEnabledRef = useRef(settings?.pushEnabled !== false);

  useEffect(() => {
    pushEnabledRef.current = settings?.pushEnabled !== false;
  }, [settings?.pushEnabled]);

  // Выносим синхронизацию в отдельную функцию
  const syncSubscription = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    if (user?.role === 'platform_admin') return;
    if (settings?.pushEnabled === false) return;

    // Проверяем, дал ли пользователь разрешение в браузере
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    try {
      // subscribePush сам проверит наличие подписки и отправит её на бэкенд
      const result = await subscribePush();
      if (result?.ok) {
        console.log('[push] background sync: subscription verified/restored');
      }
    } catch (e) {
      console.warn('[push] background sync error:', e);
    }
  }, [user?.id, user?.role, settings?.pushEnabled]);

  // 1. Первичная подписка при входе
  useEffect(() => {
    syncSubscription();
  }, [syncSubscription]);

  // 2. Синхронизация при возврате на вкладку (Self-Healing)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Также добавляем фокус окна (для десктопа)
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [syncSubscription]);

  // ----------------------------------------------------------------
  // Приём push и действий из Service Worker
  // ----------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onPushMessage((message) => {
      if (!message || !message.type) return;

      if (message.type === 'push') {
        const payload = message.payload || {};
        if (pushEnabledRef.current) showBrowserNotification(payload);
        setNotifications((prev) => [payload, ...prev]);
      }
    });
    return unsubscribe;
  }, []);

  // ----------------------------------------------------------------
  // Socket-уведомления (real-time)
  // ----------------------------------------------------------------
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    if (user?.role === 'platform_admin') return;

    const socket = getSocket(userId);
    if (!socket) return;

    const handleNotification = (payload) => {
      setNotifications((prev) => [payload, ...prev]);
      if (pushEnabledRef.current) showBrowserNotification(payload);
    };

    const handleResponseUpdate = (payload) => {
      const notif = {
        title: 'Ответ родителя',
        body: `${payload.childName || 'Ребёнок'}: ${
          payload.status === 'yes' ? 'придёт' : 'не придёт'
        }`,
        type: 'lesson_response_update',
        raw: payload,
      };
      setNotifications((prev) => [notif, ...prev]);
      if (pushEnabledRef.current) showBrowserNotification(notif);
    };

    const handleResponseTimeout = (payload) => {
      const notif = {
        title: 'Нет ответа',
        body: `${payload.childName || 'Ребёнок'}: родитель не ответил за 20 минут`,
        type: 'lesson_response_timeout',
        raw: payload,
      };
      setNotifications((prev) => [notif, ...prev]);
      if (pushEnabledRef.current) showBrowserNotification(notif);
    };

    socket.on('notification', handleNotification);
    socket.on('lesson_response_update', handleResponseUpdate);
    socket.on('lesson_response_timeout', handleResponseTimeout);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('lesson_response_update', handleResponseUpdate);
      socket.off('lesson_response_timeout', handleResponseTimeout);
    };
  }, [user?.id, user?.role]);

  return { notifications };
};

const showBrowserNotification = (payload) => {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return;
  }
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(payload.title || 'Уведомление', {
      body: payload.body || '',
      icon: '/icons/turtle-192.png',
    });
  } catch (e) {
    console.warn('Browser notification error:', e);
  }
};

export default useNotifications;