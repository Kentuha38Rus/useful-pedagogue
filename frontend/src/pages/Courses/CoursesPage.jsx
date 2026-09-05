import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCourses } from '../../store/slices/authSlice'; // или из общего store
import { fetchChildren } from '../../store/slices/authSlice'; // чтобы подгрузить детей
import Card from '../../components/common/Card';
import styles from './CoursesPage.module.scss';

const CoursesPage = () => {
  const dispatch = useDispatch();
  const { courses, children } = useSelector((state) => state.auth);
  
  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchChildren()); // подгружаем детей с группами и занятиями
  }, [dispatch]);

  // Проверяем, есть ли у родителя ребёнок, записанный на этот курс
  const isChildEnrolled = (courseId) => {
    return children.some(child => 
      child.group && child.group.courseId === courseId
    );
  };

  // Получаем список групп, в которые записаны дети на этот курс
  const getEnrolledGroups = (courseId) => {
    return children
      .filter(child => child.group && child.group.courseId === courseId)
      .map(child => child.group.name)
      .filter((v, i, a) => a.indexOf(v) === i); // уникальные группы
  };

  return (
    <div className={styles.coursesPage}>
      <h1>Курсы</h1>
      <div className={styles.courseList}>
        {courses.map(course => (
          <Card key={course.id} className={styles.courseCard}>
            <h3>{course.name}</h3>
            <p>{course.description}</p>
            <p>Цена: {course.price} ₽</p>
            <p>Возраст: {course.ageMin}–{course.ageMax} лет</p>
            
            {/* Индикатор записи */}
            {isChildEnrolled(course.id) ? (
              <div className={styles.enrolled}>
                <span className={styles.badge}>✓ Ваш ребёнок записан</span>
                <p>Группы: {getEnrolledGroups(course.id).join(', ')}</p>
              </div>
            ) : (
              <div className={styles.notEnrolled}>
                <span>Нет записи</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CoursesPage;