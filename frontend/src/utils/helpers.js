export const handleApiError = (err) => {
  if (err.response) {
    return err.response.data.message || 'Ошибка сервера';
  }
  if (err.request) {
    return 'Нет ответа от сервера';
  }
  return err.message;
};