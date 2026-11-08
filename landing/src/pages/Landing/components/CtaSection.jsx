import React from 'react';
import Button from '../../../components/common/Button';
import styles from './CtaSection.module.scss';

const CtaSection = ({ onDiagnosticClick }) => {
  return (
    <section className={styles.cta}>
      <div className={styles.content}>
        <h2>Готовы начать?</h2>
        <p>
          Запишитесь на бесплатную диагностику и узнайте, как мы можем помочь вашему ребёнку
        </p>
        <button
          onClick={onDiagnosticClick}
          className={styles.ctaBtn}
        >
          <Button variant="primary" size="large">Записаться на диагностику</Button>
        </button>
      </div>
    </section>
  );
};

export default CtaSection;