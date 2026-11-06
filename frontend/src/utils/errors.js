/**
 * Универсальный извлекатель сообщения об ошибке.
 *
 * Поддерживает:
 *   - строку (throw 'error')
 *   - axios-ошибку: { response: { data: { message } } }
 *   - axios-ошибку валидации: { response: { data: { errors: [...] } } }
 *   - Error с .message
 */
export const getErrorMessage = (err, fallback = 'Произошла ошибка') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  // axios: серверное сообщение
  const data = err.response?.data;
  if (data) {
    if (typeof data.message === 'string' && data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors.length) {
      return data.errors
        .map((e) => (typeof e === 'string' ? e : e.message))
        .filter(Boolean)
        .join('; ');
    }
  }

  if (err.message) return err.message;
  return fallback;
};