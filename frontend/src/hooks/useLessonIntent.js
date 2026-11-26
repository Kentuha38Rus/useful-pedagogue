import { useState } from 'react';
import api from '../utils/api';

const useLessonIntent = () => {
  const [state, setState] = useState({});

  const respond = async (lessonId, childId, status) => {
    const key = `${lessonId}:${childId}`;
    if (state[key]?.loading) return;

    setState((prev) => ({
      ...prev,
      [key]: { loading: true, message: '', error: '', status: null },
    }));

    try {
      const response = await api.post(`/schedule/lessons/${lessonId}/intent`, {
        childId,
        status,
      });
      setState((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          message: response.data?.message || 'Администратор уведомлён в чате',
          error: '',
          status,
        },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          message: '',
          error:
            error.response?.data?.error ||
            error.response?.data?.message ||
            'Не удалось отправить',
          status: null,
        },
      }));
    }
  };

  return { state, respond };
};

export default useLessonIntent;
