import React, { createContext, useContext } from 'react';
import useNotifications from '../hooks/useNotifications';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const notif = useNotifications();
  return <NotificationContext.Provider value={notif}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => useContext(NotificationContext);