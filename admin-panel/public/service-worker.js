/*
 * На домене админки service worker не используется.
 *
 * Этот файл нужен, чтобы заменить устаревший service worker от PWA, который
 * мог установиться на admin.juurnal.ru, когда домены были перепутаны и по
 * этому адресу временно отдавался личный кабинет. Такой worker кэширует
 * оболочку PWA и при обновлении страницы показывает личный кабинет вместо
 * админки.
 *
 * Браузер при проверке обновления запрашивает именно /service-worker.js,
 * получает этот файл, ставит его вместо старого, а мы удаляем кэши и снимаем
 * регистрацию. Своего обработчика fetch здесь нет, поэтому все запросы идут
 * в сеть — админка загружается как обычно.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (error) {
        // Кэши могли быть уже удалены — это не ошибка.
      }

      try {
        await self.clients.claim();
      } catch (error) {
        // Клиенты могут быть недоступны — не критично.
      }

      try {
        await self.registration.unregister();
      } catch (error) {
        // Регистрация могла быть уже снята — не критично.
      }
    })()
  );
});
