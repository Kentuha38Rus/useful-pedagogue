import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import styles from './Header.module.scss';
import turtleIcon from '../../assets/images/turtle-small.png';
import {
  getImpersonation,
  stopImpersonation,
} from '../../utils/impersonation';

const Header = () => {
  const { user, tenant, isPlatformAdmin } = useSelector((state) => state.auth);
  const [impersonation, setImpersonation] = useState(getImpersonation());

  // localStorage — источник истины; синхронизируем при смене user.
  useEffect(() => {
    setImpersonation(getImpersonation());
  }, [user]);

  const handleStopImpersonation = () => {
    stopImpersonation();
    setImpersonation(null);
    // Выходим в платформенную панель. loadUser перезагрузит контекст.
    window.location.href = '/platform';
  };

  const inImpersonation = !!impersonation;

  // Название в хедере:
  //   - имперсонация: название школы (tenant.name, приходит из getMe)
  //   - platform_admin без имперсонации: «Платформа»
  //   - обычный пользователь: tenant.name
  //   - fallback: бренд продукта
  let brandTitle;
  if (inImpersonation) {
    brandTitle = tenant?.name || impersonation.name || 'Школа';
  } else if (isPlatformAdmin) {
    brandTitle = 'Платформа';
  } else {
    brandTitle = tenant?.name || 'Полезный педагог';
  }

  return (
    <>
      <header className={styles.header}>
        <img src={turtleIcon} alt="Черепашка" className={styles.logo} />
        <span className={styles.title}>{brandTitle}</span>
        {isPlatformAdmin && !inImpersonation && (
          <Link to="/platform" className={styles.platformLink}>
            Панель
          </Link>
        )}
        {user && <span className={styles.userName}>{user.name}</span>}
      </header>

      {inImpersonation && (
        <div className={styles.impersonationBanner}>
          <span>
            🎭 Режим имперсонации:{' '}
            <strong>{impersonation.name || tenant?.name || 'Тенант'}</strong>
          </span>
          <button
            type="button"
            className={styles.exitImpersonation}
            onClick={handleStopImpersonation}
          >
            Выйти
          </button>
        </div>
      )}
    </>
  );
};

export default Header;