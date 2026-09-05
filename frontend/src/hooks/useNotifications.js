import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { subscribePush, onPushMessage } from '../utils/notifications';

const useNotifications = () => {
  const { settings } = useSelector((state) => state.auth);

  useEffect(() => {
    if (settings.pushEnabled) {
      subscribePush();
    }
  }, [settings.pushEnabled]);

  useEffect(() => {
    const unsubscribe = onPushMessage((payload) => {
      // обработать входящее уведомление
      console.log('Push received:', payload);
    });
    return unsubscribe;
  }, []);
};

export default useNotifications;