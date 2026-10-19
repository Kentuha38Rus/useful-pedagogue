import { io } from 'socket.io-client';

let socket = null;
let currentUserId = null;

export const getSocket = (userId) => {
  if (!userId) return null;
  if (socket && currentUserId === userId) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = apiUrl.startsWith('http')
    ? apiUrl.replace(/\/api\/?$/, '')
    : (import.meta.env.VITE_SOCKET_URL || '');

  const token = localStorage.getItem('token');

  socket = io(baseUrl || undefined, {
    path: '/socket.io',
    auth: { token: token || undefined },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  currentUserId = userId;

  socket.on('connect', () => console.log('[socket] admin connected as', userId));
  socket.on('disconnect', (reason) => console.log('[socket] disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[socket] connect_error:', err.message));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
  }
};