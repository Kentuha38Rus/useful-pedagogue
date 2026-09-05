import React from 'react';
import { useSelector } from 'react-redux';
import styles from './Header.module.scss';
import turtleIcon from '../../assets/images/turtle-small.png'; // добавить картинку

const Header = () => {
  const { user } = useSelector((state) => state.auth);
  return (
    <header className={styles.header}>
      <img src={turtleIcon} alt="Черепашка" className={styles.logo} />
      <span className={styles.title}>Полезный педагог</span>
      {user && <span className={styles.userName}>{user.name}</span>}
    </header>
  );
};

export default Header;