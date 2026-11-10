import React from 'react';
import styles from './Contacts.module.scss';

const Contacts = () => {
  const lat = 52.214;
  const lon = 104.101;
  const zoom = 17;
  const BASE_URL = import.meta.env.BASE_URL;

  return (
    <section id="contacts" className={styles.contacts}>
      <h2>Контакты</h2>

      <div className={styles.info}>
        <div className={styles.item}>
          <span className={styles.icon}>📍</span>
          <p>Иркутская область, Шелехов, 2-й квартал, 18А</p>
        </div>
        <div className={styles.item}>
          <span className={styles.icon}>📞</span>
          <p>+7 (950) 109-55-35</p>
        </div>
        <div className={styles.item}>
          <span className={styles.icon}>🕒</span>
          <p>Пн–Вс: 10:00 – 20:00</p>
        </div>
      </div>

      <div className={styles.mapContainer}>
        {/* Карта OpenStreetMap может передавать IP-адрес пользователя в OSM. Это прописано в Политике. */}
        <iframe
          title="Карта центра"
          className={styles.mapIframe}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`}
          allowFullScreen
          frameBorder="0"
          scrolling="no"
        />
      </div>

      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.mapLink}
      >
        Открыть карту в большом размере
      </a>

      <div className={styles.social}>
        <a href="https://vk.ru/pedagogef" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
          <i className="fab fa-vk"></i>
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
          <i className="fab fa-telegram-plane"></i>
        </a>
        <a
          href="https://max.ru/u/f9LHodD0cOK34X3pN8Vsg5wR_EFa_cbKnpNTAihzewgGYN6eRldnoi3Xiuk"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialLink}
        >
          <img src={`${BASE_URL}icons/Max_logo_black.svg`} alt="Max" className={styles.maxIcon} />
        </a>
      </div>

      {/* Дополнительная ссылка на политику для удобства */}
      <p style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
        Нажимая на иконки соцсетей, вы переходите к общению с представителем Центра. <br/>
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#0077b6', textDecoration: 'underline' }}>
          Политика обработки персональных данных
        </a>
      </p>
    </section>
  );
};

export default Contacts;