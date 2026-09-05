import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import styles from './Hero.module.scss';

const Hero = ({ onDiagnosticClick }) => {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1>Ваш Полезный педагог</h1>
        <p>
          Профессиональная помощь педагогов, удобное расписание 
          и полный контроль успехов вашего ребёнка
        </p>
        <div className={styles.buttons}>
          <Link to="/login">
            <Button variant="primary" size="large">Войти в личный кабинет</Button>
          </Link>
          <button
            onClick={onDiagnosticClick}
            className={styles.diagnosticBtn}
          >
            <Button variant="secondary" size="large">Запись на бесплатную диагностику</Button>
          </button>
        </div>
        <div className={styles.stats}>
          <span>👨‍🏫 Опытный педагог</span>
          <span>👶 Комфортные группы</span>
          <span>⭐ Индивидуальный подход</span>
        </div>
      </div>
      <div className={styles.image}>
        <video
          className={styles.heroVideo}
          src="/video/logo.mp4"
          autoPlay
          muted
          loop
          playsInline
          poster="/icons/turtle-192.png"
        />
      </div>
    </section>
  );
};

export default Hero;