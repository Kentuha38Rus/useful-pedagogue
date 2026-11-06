import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ---------------------------------------------------------------------------
// Запрос: access-токен в каждый запрос
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

// ---------------------------------------------------------------------------
// Refresh: тихо обновляем access-токен. Дедуплицируем параллельные вызовы.
// ---------------------------------------------------------------------------
let refreshPromise = null;

const tryRefresh = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const newToken = res.data?.accessToken;
      if (newToken) {
        localStorage.setItem('token', newToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ---------------------------------------------------------------------------
// Ответ: 401 → refresh → повтор запроса. 403 TENANT_SUSPENDED → logout.
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.code;

    // 401: пробуем refresh (включая TOKEN_TENANT_MISMATCH — он 401 + code)
    if (status === 401 && original && !original._retriedAfterRefresh) {
      original._retriedAfterRefresh = true;

      // Не рефрешим сам refresh-эндпоинт
      if (original.url?.includes('/auth/refresh')) {
        clearAuth();
        return Promise.reject(error);
      }

      const ok = await tryRefresh();
      if (ok) {
        const token = localStorage.getItem('token');
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }

      clearAuth();
      return Promise.reject(error);
    }

    // 403: тенант заблокирован — logout с сообщением
    if (status === 403 && code === 'TENANT_SUSPENDED') {
      localStorage.setItem(
        'flash',
        'Ваша школа заблокирована. Обратитесь к администратору.'
      );
      clearAuth();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;