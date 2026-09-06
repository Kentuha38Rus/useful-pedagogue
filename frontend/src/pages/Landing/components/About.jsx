import React, { useState } from 'react';
import styles from './About.module.scss';

const About = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  const openModal = (src) => setSelectedImage(src);
  const closeModal = () => setSelectedImage(null);

  return (
    <section id="about" className={styles.about}>
      <div className={styles.content}>
        <h2>О нашем центре</h2>
        <p>
          В нашем центре дети занимаются в группах с полутора лет до подготовки к школе. 
          Группы разделены по возрастам: малыши, младшая группа, средняя, старшая и подготовительная. 
          Занятия длятся один час и проходят в игровой форме, за это время дети успевают получить знания 
          по лексической теме и графомоторные навыки, сделать поделку, познакомиться с окружающим мир, 
          развивать логику и мышление, старшие дети изучают цифры и буквы.
        </p>
        <p>
          Также есть индивидуальные занятия с логопедом-дефектологом и занятия по коррекции поведения.
        </p>
        <p>
          Еще в нашем центре есть направление по работе с детьми с ОВЗ. 
          Индивидуальные занятия длительностью один час с педагогом по развитию и занятия с дефектологом длительностью 45 мин.
        </p>

        <div className={styles.tags}>
          <span className={styles.tag}>🧩 Для детей с аутизмом</span>
          <span className={styles.tag}>👶 Есть детские группы</span>
          <span className={styles.tag}>🧠 Ава-терапия</span>
          <span className={styles.tag}>🎯 Сенсорная интеграция</span>
        </div>
      </div>

      <div className={styles.image} onClick={() => openModal(`${import.meta.env.BASE_URL}icons/1.jpg`)}>
        <img src={`${import.meta.env.BASE_URL}icons/1.jpg`} alt="Черепашка" />
      </div>

      {/* Модальное окно */}
      {selectedImage && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>×</button>
            <img src={selectedImage} alt="Черепашка" />
          </div>
        </div>
      )}
    </section>
  );
};

export default About;