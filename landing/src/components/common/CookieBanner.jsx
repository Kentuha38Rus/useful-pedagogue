// landing/src/components/common/CookieBanner.jsx
import React, { useState, useEffect } from 'react';
import { loadYandexMetrika } from '../../utils/analytics';
import styles from './CookieBanner.module.scss';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Проверяем при загрузке страницы, давал ли пользователь согласие ранее
  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    
    if (consent === 'true') {
      // Если уже согласился — грузим аналитику без показа баннера
      loadYandexMetrika();
    } else if (consent === null) {
      // Если выбора еще не было — показываем баннер
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    loadYandexMetrika(); // Грузим скрипты только после согласия!
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  // Ссылка на Политику (берется из .env, по умолчанию /privacy-policy)
  const privacyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL || '/privacy-policy';

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <p>
            Мы используем файлы cookie для анализа трафика и улучшения работы сайта. 
            Нажимая «Принять все», вы даете согласие на использование аналитических cookie в соответствии с нашей{' '}
                        <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
                            Политикой обработки персональных данных
                        </a>. 
                    < br />
            <span style={{ fontSize: '13px', color: '#666', marginTop: '4px', display: 'inline-block' }}>
                    Если вы выберете «Только необходимые», мы не будем собирать данные о вашем поведении.
             </span>
        </p>
        <div className={styles.actions}>
          <button className={styles.declineBtn} onClick={handleDecline}>
            Только необходимые
          </button>
          <button className={styles.acceptBtn} onClick={handleAccept}>
            Принять все
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;