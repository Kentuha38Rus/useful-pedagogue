/*
 * Service worker админ-панели: push-уведомления и сетевой режим без кэша.
 * При активации один раз очищает старые кэши (наследие прежней PWA),
 * дальше работает как обычный push-service-worker.
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
      } catch (_) {
        // Кэши могли быть уже удалены.
      }

      try {
        await self.clients.claim();
      } catch (_) {
        // Клиенты могут быть недоступны.
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Админ-панель', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Админ-панель';
  const options = {
    body: data.body || '',
    icon: data.icon || '/turtle-192.png',
    badge: data.badge || '/turtle-192.png',
    tag: data.tag,
    renotify: !!data.tag,
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const notifData = event.notification.data || {};
  event.notification.close();
  event.waitUntil(focusOrOpen(notifData.url || '/'));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Админка всегда работает с сетью; кэш не используем.
  event.respondWith(fetch(event.request));
});

async function focusOrOpen(url) {
  const targetUrl = toAbsolute(url);
  const all = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of all) {
    if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
      try {
        await client.focus();
        if (typeof client.navigate === 'function') {
          await client.navigate(targetUrl);
        }
        return;
      } catch (_) {
        // Пробуем следующий клиент.
      }
    }
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(targetUrl);
  }
}

function toAbsolute(url) {
  if (!url) return self.registration.scope;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(String(url).replace(/^\/+/, ''), self.registration.scope).href;
}
