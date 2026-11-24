// Событие установки PWA приходит один раз и может случиться раньше, чем
// пользователь откроет личный кабинет. Поэтому слушаем его на старте приложения
// и храним здесь, а кнопка установки забирает готовое событие.
let deferredPrompt = null;
const listeners = new Set();

const notify = (event, installed = false) => {
  deferredPrompt = installed ? null : event;
  listeners.forEach((listener) => listener(event, installed));
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    notify(event);
  });

  window.addEventListener('appinstalled', () => {
    notify(null, true);
  });
}

export const getInstallPrompt = () => deferredPrompt;

export const onInstallPromptChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const clearInstallPrompt = () => {
  deferredPrompt = null;
};
