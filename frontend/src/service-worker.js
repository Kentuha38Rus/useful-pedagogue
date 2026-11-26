/* eslint-disable no-restricted-globals */
// frontend/src/service-worker.js

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST || []);

const SW_SCOPE = self.registration.scope;
const DEFAULT_ICON = new URL('icons/turtle-192.png', SW_SCOPE).href;

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Уведомление', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Уведомление';
  const options = {
    body: data.body || '',
    icon: resolveUrl(data.icon) || DEFAULT_ICON,
    badge: resolveUrl(data.badge) || DEFAULT_ICON,
    tag: data.tag,
    renotify: !!data.tag,
    requireInteraction: data.requireInteraction === true,
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
  broadcast({ type: 'push', payload: data });
});

self.addEventListener('notificationclick', (event) => {
  const notifData = event.notification.data || {};
  event.notification.close();
  event.waitUntil(focusOrOpen(notifData.url || 'app/schedule'));
});

async function focusOrOpen(url) {
  const targetUrl = toAbsolute(url);
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of all) {
    if (client.url.startsWith(SW_SCOPE) && 'focus' in client) {
      try {
        await client.focus();
        if (typeof client.navigate === 'function') await client.navigate(targetUrl);
        else client.postMessage({ type: 'navigate', url: targetUrl });
        return;
      } catch (_) {}
    }
  }
  if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
}

function broadcast(message) {
  try {
    const channel = new BroadcastChannel('push-channel');
    channel.postMessage(message);
    channel.close();
  } catch (_) {}
}

function resolveUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url.replace(/^\/+/, ''), SW_SCOPE).href;
}

function toAbsolute(url) {
  if (!url) return SW_SCOPE;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(String(url).replace(/^\/+/, ''), SW_SCOPE).href;
}