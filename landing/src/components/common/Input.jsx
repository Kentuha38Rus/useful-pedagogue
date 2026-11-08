import React from 'react';
import styles from './Input.module.scss';

const Input = ({ label, error, className, ...props }) => {
  return (
    <div className={`${styles.inputGroup} ${className || ''}`}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={`${styles.input} ${error ? styles.error : ''}`} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
};

export default Input;