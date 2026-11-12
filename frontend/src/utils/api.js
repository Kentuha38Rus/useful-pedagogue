import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true, // Разрешаем браузеру отправлять httpOnly cookies
});

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
  localStorage.removeItem('refreshToken'); // На всякий случай
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

let refreshPromise = null;
const tryRefresh = async () => {
  if (refreshPromise) return refreshPromise;
  
  refreshPromise = (async () => {
    try {
      // refreshToken автоматически берется из httpOnly cookie браузером
      const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
      const newToken = res.data?.accessToken;
      if (newToken) {
        localStorage.setItem('token', newToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      // ИСПРАВЛЕНО: Держим блокировку 2 секунды. 
      // Это дает браузеру время сохранить новую httpOnly cookie, 
      // чтобы параллельные запросы не использовали старый (уже удаленный) токен.
      setTimeout(() => {
        refreshPromise = null;
      }, 2000);
    }
  })();
  
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retriedAfterRefresh) {
      // Если сам запрос на обновление вернул 401 — сессия окончательно мертва
      if (original.url?.includes('/auth/refresh')) {
        clearAuth();
        return Promise.reject(error);
      }

      original._retriedAfterRefresh = true;
      
      const ok = await tryRefresh();
      if (ok) {
        const token = localStorage.getItem('token');
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original); // Повторяем исходный запрос с новым токеном
      }
      
      clearAuth();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;