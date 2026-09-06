import React, { useEffect, useRef } from 'react';
import Button from '../../../components/common/Button';
import styles from './DiagnosticModal.module.scss';

const DiagnosticModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);
  const BASE_URL = import.meta.env.BASE_URL;

  // Закрытие по Escape и клику вне модалки
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // блокируем скролл
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>

        <div className={styles.videoContainer}>
          <video
            className={styles.modalVideo}
            src={`${BASE_URL}video/logo.mp4`}
            autoPlay
            muted
            loop
            playsInline
            poster={`${BASE_URL}icons/turtle-192.png`}
          />
        </div>

        <div className={styles.content}>
          <h2>Запись на бесплатную диагностику</h2>
          <p>
            Выберите удобный мессенджер для связи с нашим специалистом.
            Мы ответим на все вопросы и подберём удобное время.
          </p>

          <div className={styles.messengers}>
            <a
              href="https://vk.com/yourpage" // замените на реальную ссылку VK
              target="_blank"
              rel="noopener noreferrer"
              className={styles.messengerLink}
            >
              <i className="fab fa-vk"></i>
              <span>VK</span>
            </a>
            <a
              href="https://t.me/yourchannel" // замените на реальную ссылку Telegram
              target="_blank"
              rel="noopener noreferrer"
              className={styles.messengerLink}
            >
              <i className="fab fa-telegram-plane"></i>
              <span>Telegram</span>
            </a>
            <a
              href="#" // замените на реальную ссылку мессенджера Max
              target="_blank"
              rel="noopener noreferrer"
              className={styles.messengerLink}
            >
              <img
                src={`${BASE_URL}icons/Max_logo_black.svg`}
                alt="Max"
                className={styles.maxIcon}
              />
              <span>Max</span>
            </a>
          </div>

          <div className={styles.footerText}>
            <p>Нажимая на иконку, вы соглашаетесь на обработку персональных данных</p>
            <Button variant="secondary" onClick={onClose} className={styles.cancelBtn}>
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticModal;