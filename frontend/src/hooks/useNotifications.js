import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { subscribePush, onPushMessage } from '../utils/notifications';
import { getSocket } from '../utils/socket';

const useNotifications = () => {
  const { settings, user } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);

  // ----------------------------------------------------------------
  // Автоподписка на push.
  // Не подписываем platform_admin — у него нет tenantId.
  // ----------------------------------------------------------------
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    if (user?.role === 'platform_admin') return; // ← ФИКС

    if (settings?.pushEnabled === false) {
      console.log('[push] auto-subscribe skipped (pushEnabled=false)');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await subscribePush();
        if (cancelled) return;
        if (result?.ok) {
          console.log('[push] auto-subscribed for user', userId);
        } else {
          console.warn(
            '[push] auto-subscribe did not complete:',
            result?.reason || 'unknown'
          );
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[push] auto-subscribe error:', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, settings?.pushEnabled]);

  // ----------------------------------------------------------------
  // Приём push и действий из Service Worker
  // ----------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onPushMessage((message) => {
      if (!message || !message.type) return;

      if (message.type === 'push') {
        const payload = message.payload || {};
        showBrowserNotification(payload);
        setNotifications((prev) => [payload, ...prev]);
      } else if (message.type === 'notification_action') {
        const { action, data } = message;
        setNotifications((prev) => [
          {
            title: action === 'yes' ? 'Вы подтвердили' : 'Вы отказались',
            body: `Ответ отправлен (responseId=${data?.responseId})`,
            type: 'local_ack',
          },
          ...prev,
        ]);
      }
    });
    return unsubscribe;
  }, []);

  // ----------------------------------------------------------------
  // Socket-уведомления (real-time)
  // Не подключаем для platform_admin.
  // ----------------------------------------------------------------
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    if (user?.role === 'platform_admin') return; // ← ФИКС

    const socket = getSocket(userId);
    if (!socket) return;

    const handleNotification = (payload) => {
      setNotifications((prev) => [payload, ...prev]);
      showBrowserNotification(payload);
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
      showBrowserNotification(notif);
    };

    const handleResponseTimeout = (payload) => {
      const notif = {
        title: 'Нет ответа',
        body: `${payload.childName || 'Ребёнок'}: родитель не ответил за 20 минут`,
        type: 'lesson_response_timeout',
        raw: payload,
      };
      setNotifications((prev) => [notif, ...prev]);
      showBrowserNotification(notif);
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