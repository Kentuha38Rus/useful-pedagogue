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
        
        {/* Ошибка исправлена: убран внешний <button>, onClick перенесен на сам компонент Button */}
        <Button 
          variant="primary" 
          size="large" 
          onClick={onDiagnosticClick}
          className={styles.ctaBtn}
        >
          Записаться на диагностику
        </Button>
        
      </div>
    </section>
  );
};

export default CtaSection;