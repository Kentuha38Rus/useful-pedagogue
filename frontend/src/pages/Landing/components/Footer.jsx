import React from 'react';
import styles from './Footer.module.scss';

const Footer = () => {
  const BASE_URL = import.meta.env.BASE_URL;

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p>© 2026 Useful Pedagogue – Все права защищены</p>
        <div className={styles.social}>
          <a
            href="https://vk.ru/pedagogef"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="VK"
            className={styles.socialLink}
          >
            <i className="fab fa-vk"></i>
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            className={styles.socialLink}
          >
            <i className="fab fa-telegram-plane"></i>
          </a>
          <a
            href="https://max.ru/u/f9LHodD0cOK34X3pN8Vsg5wR_EFa_cbKnpNTAihzewgGYN6eRldnoi3Xiuk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Max"
            className={styles.socialLink}
          >
            <img
              src={`${BASE_URL}icons/Max_logo_black.svg`}
              alt="Max"
              className={styles.maxIcon}
            />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;