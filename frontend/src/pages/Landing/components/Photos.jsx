import React, { useState, useEffect, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import styles from './Photos.module.scss';

const Photos = () => {
  const BASE_URL = import.meta.env.BASE_URL;

  const images = [
    `${BASE_URL}photo/album1.webp`,
    `${BASE_URL}photo/album2.webp`,
    `${BASE_URL}photo/album3.webp`,
    `${BASE_URL}photo/album4.webp`,
    `${BASE_URL}photo/album5.webp`,
    `${BASE_URL}photo/album6.webp`,
  ];

  const [page, setPage] = useState(0);
  const [totalPages] = useState(images.length);
  const [selectedImage, setSelectedImage] = useState(null);
  const flipBookRef = useRef(null);

  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedImage]);

  const getBookSize = () => {
    const width = window.innerWidth;
    if (width < 480) return { width: 200, height: 280 };
    if (width < 768) return { width: 300, height: 420 };
    return { width: 450, height: 600 };
  };

  const [bookSize, setBookSize] = useState(getBookSize());

  const getFlippingTime = () => {
    const width = window.innerWidth;
    if (width < 480) return 2800;
    if (width < 768) return 1500;
    return 1000;
  };

  const [flippingTime, setFlippingTime] = useState(getFlippingTime());

  useEffect(() => {
    const handleResize = () => {
      setBookSize(getBookSize());
      setFlippingTime(getFlippingTime());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPage = (e) => setPage(e.data);

  const nextPage = () => {
    if (flipBookRef.current) flipBookRef.current.pageFlip().flipNext();
  };
  const prevPage = () => {
    if (flipBookRef.current) flipBookRef.current.pageFlip().flipPrev();
  };

  const openModal = (src) => setSelectedImage(src);
  const closeModal = () => setSelectedImage(null);

  return (
    <section id="photos" className={styles.photos}>
      <h2>Фото</h2>
      <div className={styles.flipWrapper}>
        <HTMLFlipBook
          ref={flipBookRef}
          width={bookSize.width}
          height={bookSize.height}
          size="stretch"
          minWidth={150}
          maxWidth={600}
          minHeight={200}
          maxHeight={800}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onPage}
          useMouseEvents={false}
          clickEventForward={false}
          flippingTime={flippingTime}
          className={styles.flipBook}
          style={{ margin: '0 auto' }}
        >
          {/* Первая обложка – как страница с фото */}
          <div className={styles.page}>
            <div className={styles.pageImageWrapper}>
              <img src={`${BASE_URL}photo/oblogka.jpg`} alt="Обложка" />
              <div className={styles.overlay}>
                <h3>Наш центр</h3>
                <p>Фотогалерея</p>
              </div>
            </div>
          </div>

          {/* Страницы с фото */}
          {images.map((src, index) => (
            <div key={index} className={styles.page}>
              <div
                className={styles.pageImageWrapper}
                onClick={() => openModal(src)}
              >
                <img src={src} alt={`Фото ${index + 1}`} />
              </div>
            </div>
          ))}

          {/* Последняя обложка – как страница с фото */}
          <div className={styles.page}>
            <div className={styles.pageImageWrapper}>
              <img src={`${BASE_URL}photo/spasibo.webp`} alt="Задняя обложка" />
              <div className={styles.overlay}>
                <h3>Спасибо за внимание!</h3>
              </div>
            </div>
          </div>
        </HTMLFlipBook>

        <div className={styles.controls}>
          <button onClick={prevPage} className={styles.controlBtn}>‹</button>
          <span className={styles.pageIndicator}>{page + 1} / {totalPages + 2}</span>
          <button onClick={nextPage} className={styles.controlBtn}>›</button>
        </div>
      </div>

      {selectedImage && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>×</button>
            <img src={selectedImage} alt="Фото" />
          </div>
        </div>
      )}
    </section>
  );
};

export default Photos;