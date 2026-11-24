import React, { useEffect, useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import {
  clearInstallPrompt,
  getInstallPrompt,
  onInstallPromptChange,
} from '../../utils/installPrompt';
import styles from './InstallApp.module.scss';

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia('(display-mode: standalone)');
  return media.matches || window.navigator.standalone === true;
};

const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iphoneOrIpad = /iphone|ipad|ipod/i.test(ua);
  const ipadOs =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iphoneOrIpad || ipadOs;
};

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(getInstallPrompt);
  const [installed, setInstalled] = useState(isStandalone);
  const [showHint, setShowHint] = useState(false);
  const [ios] = useState(isIosDevice);

  useEffect(() => {
    const unsubscribe = onInstallPromptChange((event, wasInstalled) => {
      setDeferredPrompt(event);
      if (wasInstalled) {
        setInstalled(true);
        setShowHint(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt || getInstallPrompt();
    if (!promptEvent) {
      setShowHint(true);
      return;
    }

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') {
        setInstalled(true);
      }
    } catch (error) {
      setShowHint(true);
    } finally {
      clearInstallPrompt();
      setDeferredPrompt(null);
    }
  };

  if (installed) return null;

  return (
    <Card className={styles.installCard}>
      <div className={styles.header}>
        <div className={styles.icon} aria-hidden="true">📲</div>
        <div className={styles.text}>
          <h3>Установить на рабочий экран</h3>
          <p>
            Личный кабинет откроется в одно касание — как обычное приложение,
            без адресной строки браузера.
          </p>
        </div>
      </div>

      <Button variant="primary" onClick={handleInstall}>
        {ios && !deferredPrompt
          ? 'Как установить на iPhone'
          : 'Установить приложение'}
      </Button>

      {showHint && (
        <div className={styles.hint}>
          {ios ? (
            <>
              <strong>На iPhone и iPad:</strong> откройте сайт в Safari,
              нажмите кнопку «Поделиться» (квадрат со стрелкой вверх), затем
              «На экран «Домой»» и «Добавить». В Chrome на iPhone пункт
              называется «Добавить на главный экран».
            </>
          ) : (
            <>
              <strong>Android:</strong> меню браузера (три точки) →
              «Установить приложение» или «Добавить на главный экран».
              <br />
              <strong>Компьютер (Chrome, Edge):</strong> значок установки в
              адресной строке или меню → «Установить приложение».
              <br />
              <strong>Safari на Mac:</strong> меню «Файл» → «Добавить на
              панель Dock» (в новых версиях) или «Поделиться» → «Добавить на
              экран «Домой»».
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default InstallApp;
