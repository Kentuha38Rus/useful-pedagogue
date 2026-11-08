import React, { useState, useEffect } from 'react';
import { Link } from 'react-scroll';
import Button from '../../components/common/Button';
import styles from './PublicHeader.module.scss';
import turtleIcon from '../../assets/images/turtle-small.png';

const PublicHeader = ({ onDiagnosticClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Закрываем меню при клике на ссылку
  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img src={turtleIcon} alt="Полезный педагог" />
          <span></span>
        </div>

        {/* Бургер-иконка для мобильных */}
        <button
          className={`${styles.burger} ${menuOpen ? styles.active : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Открыть меню"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Навигация */}
        <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
          <Link to="about" smooth={true} duration={500} className={styles.navLink} onClick={handleLinkClick}>
            О нас
          </Link>
          <Link to="catalog" smooth={true} duration={500} className={styles.navLink} onClick={handleLinkClick}>
            Каталог
          </Link>
          <Link to="photos" smooth={true} duration={500} className={styles.navLink} onClick={handleLinkClick}>
            Фото
          </Link>
          <Link to="contacts" smooth={true} duration={500} className={styles.navLink} onClick={handleLinkClick}>
            Контакты
          </Link>
        </nav>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onDiagnosticClick}>
            <span className={styles.fullText}>Записаться на бесплатную диагностику</span>
            <span className={styles.shortText}>Записаться</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;