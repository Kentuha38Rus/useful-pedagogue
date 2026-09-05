import React from 'react';
import styles from './Card.module.scss';

const Card = ({ children, className, ...props }) => {
  return (
    <div className={`${styles.card} ${className || ''}`} {...props}>
      {children}
    </div>
  );
};

export default Card;