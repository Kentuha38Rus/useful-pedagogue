import React from 'react';
import Card from '../common/Card';
import styles from './LessonCard.module.scss';

const LessonCard = ({ lesson }) => {
  return (
    <Card className={styles.lessonCard}>
      <div className={styles.time}>{lesson.time}</div>
      <div className={styles.info}>
        <div className={styles.title}>{lesson.title}</div>
        <div className={styles.teacher}>{lesson.teacher}</div>
      </div>
      <div className={styles.group}>{lesson.group}</div>
    </Card>
  );
};

export default LessonCard;