import React from 'react';
import styles from './Button.module.scss';

const Button = ({ children, variant = 'primary', onClick, disabled, className, ...props }) => {
  const classes = `${styles.button} ${styles[variant]} ${className || ''}`;
  return (
    <button className={classes} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default Button;