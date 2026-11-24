import { io } from 'socket.io-client';

let socket = null;
let currentUserId = null;
let authRetryDone = false;

const refreshSocketAuth = () => {
  if (!socket) return;
  socket.auth = { token: localStorage.getItem('token') || undefined };
};

// Явно переподключить сокет с актуальным токеном.
// Нужно после выхода приложения из фона на iPhone: старый access-токен
// истекает, и автоматический reconnect с ним не проходит.
export const ensureSocketConnected = () => {
  if (!socket) return null;
  refreshSocketAuth();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const getSocket = (userId) => {
  if (!userId) return null;

  if (socket && currentUserId === userId) {
    refreshSocketAuth();
    if (!socket.connected) socket.connect();
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  authRetryDone = false;

  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  // VITE_API_URL может быть '/api' (relative) или 'http://...'
  const baseUrl = apiUrl.startsWith('http')
    ? apiUrl.replace(/\/api\/?$/, '')
    : (import.meta.env.VITE_SOCKET_URL || ''); // пусто = same-origin

  socket = io(baseUrl || undefined, {
    path: '/socket.io',
    auth: { token: localStorage.getItem('token') || undefined },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  currentUserId = userId;

  // Перед каждой попыткой переподключения берём свежий токен из localStorage
  socket.io.on('reconnect_attempt', () => {
    refreshSocketAuth();
  });

  socket.on('connect', () => {
    authRetryDone = false;
    console.log('[socket] connected as', userId, socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connect_error:', err.message);

    // Если сервер отверг именно токен — обновляем его и пробуем ещё раз
    const isAuthError =
      err?.message === 'Invalid token' ||
      err?.message === 'Authentication required' ||
      err?.message === 'User not found';

    if (isAuthError && !authRetryDone) {
      authRetryDone = true;
      refreshSocketAuth();
      socket.connect();
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
    authRetryDone = false;
  }
};
