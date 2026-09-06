import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import styles from './Catalog.module.scss';

const Catalog = () => {
  const BASE_URL = import.meta.env.BASE_URL;

  const catalogData = [
    {
      id: 1,
      title: 'Запуск речи',
      category: 'logoped',
      price: '1 000 ₽',
      duration: 'за 45 мин',
      description: 'Логопедические занятия для запуска речи у детей. Индивидуальный подход, игровая форма, развитие артикуляционного аппарата.',
      tags: ['запуск речи', 'логопед'],
      image: `${BASE_URL}photo/zapuck_rechi.jpg`,
    },
    {
      id: 2,
      title: 'Формирование бытовых навыков',
      category: 'korrektsionnye',
      price: '1 000 ₽',
      duration: 'за 45 мин',
      description: 'На занятии дети учатся пить из стакана, пользоваться столовыми приборами, мыть посуду, накрывать на стол, застилать кровать, готовить легкую пищу и многое другое из того, что необходимо для облегчения повседневной жизни.',
      tags: ['бытовые навыки'],
      image: `${BASE_URL}photo/domdela.jpg`,
    },
    {
      id: 3,
      title: 'АФК и сенсорно-моторная интеграция',
      category: 'korrektsionnye',
      price: '1 000 ₽',
      duration: 'за 45 мин',
      description: 'АФК, сенсорика, моторные навыки, восприятие тактильное, зрительное, слуховое',
      tags: ['АФК', 'сенсорная интеграция'],
      image: `${BASE_URL}photo/ahk.jpg`,
    },
    {
      id: 4,
      title: 'Коммуникативная группа',
      category: 'korrektsionnye',
      price: '1 000 ₽',
      duration: 'за 1 ч',
      description: 'Коллективные игры для развития общения, логоритмика для речи и внимания, поделки, продуктивная деятельность, сюжетно-ролевая игра, навыки самоконтроля и ожидания.',
      tags: ['коммуникация', 'группа'],
      image: `${BASE_URL}photo/comunication.jpg`,
    },
    {
      id: 5,
      title: 'Логопед-дефектолог',
      category: 'logoped',
      price: '1 200 ₽',
      duration: 'за 45 мин',
      description: 'логопед-дефектолог шелехов, развивающие занятия, логопед-дефектолог, развитие детей шелехов, дефектолог',
      tags: ['логопед', 'дефектолог'],
      image: `${BASE_URL}photo/zapuck_rechi.jpg`,
    },
    {
      id: 6,
      title: 'Подготовка к школе',
      category: 'razvivayushchie',
      price: '500 ₽',
      duration: 'за 1 ч',
      description: 'центры раннего развития детей, подготовка к школе, развивающие занятия, центр детского развития, дошкольное образование, курсы для детей, педагог, развитие детей шелехов',
      tags: ['подготовка к школе', 'развитие'],
      image: `${BASE_URL}photo/school.jpg`,
    },
    {
      id: 7,
      title: 'Логопед',
      category: 'razvivayushchie',
      price: '800 ₽',
      duration: 'за 45 мин',
      description: 'логопед, логопед-дефектолог шелехов, логопед шелехов, логопед-дефектолог',
      tags: ['логопед', 'развитие речи'],
      image: `${BASE_URL}photo/logoped.jpg`,
    },
    {
      id: 8,
      title: 'АВА-терапия, занятия для детей с ОВЗ',
      category: 'korrektsionnye',
      price: '1 400 ₽',
      duration: 'за 1 ч',
      description: 'РАС, аутизм, АВА-терапия, ОВЗ, валянки, СДДГ, эхо, хор, коррекция поведения.',
      tags: ['АВА-терапия', 'ОВЗ', 'коррекция поведения'],
      image: `${BASE_URL}photo/ava.jpg`,
    },
    {
      id: 9,
      title: 'Коррекция поведения',
      category: 'korrektsionnye',
      price: '1 400 ₽',
      duration: 'за 1 ч',
      description: 'РАС, аутизм, АВА-терапия, ОВЗ, алалия, СДВГ, зпр, зрр, коррекция поведения',
      tags: ['коррекция поведения', 'СДВГ'],
      image: `${BASE_URL}photo/povedenie.jpg`,
    },
    {
      id: 10,
      title: 'Индивидуальное занятие',
      category: 'razvivayushchie',
      price: '1 200 ₽',
      duration: 'за 1 ч',
      description: 'центры раннего развития детей, подготовка к школе, развивающие занятия, центр детского развития, дошкольное образование, курсы для детей, педагог, развитие детей шелехов',
      tags: ['индивидуальное', 'развитие'],
      image: `${BASE_URL}photo/individual.jpg`,
    },
    {
      id: 11,
      title: 'Развивающие занятия в группе',
      category: 'razvivayushchie',
      price: '500 ₽',
      duration: 'за 1 ч',
      description: 'центры раннего развития детей, подготовка к школе, развивающие занятия, центр детского развития, дошкольное образование, курсы для детей, педагог, развитие детей шелехов',
      tags: ['групповые', 'развитие'],
      image: `${BASE_URL}photo/grup.jpg`,
    },
  ];

  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullImage, setFullImage] = useState(null);

  const filteredItems =
    activeTab === 'all'
      ? catalogData
      : catalogData.filter(item => item.category === activeTab);

  const openModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const openFullImage = (src) => {
    setFullImage(src);
  };

  const closeFullImage = () => {
    setFullImage(null);
  };

  return (
    <section id="catalog" className={styles.catalog}>
      <h2>Каталог</h2>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'all' ? styles.active : ''}
          onClick={() => setActiveTab('all')}
        >
          Все
        </button>
        <button
          className={activeTab === 'korrektsionnye' ? styles.active : ''}
          onClick={() => setActiveTab('korrektsionnye')}
        >
          Коррекционные занятия
        </button>
        <button
          className={activeTab === 'razvivayushchie' ? styles.active : ''}
          onClick={() => setActiveTab('razvivayushchie')}
        >
          Развивающие занятия
        </button>
        <button
          className={activeTab === 'logoped' ? styles.active : ''}
          onClick={() => setActiveTab('logoped')}
        >
          Логопед
        </button>
      </div>

      <Swiper
        modules={[Navigation, Pagination]}
        direction="horizontal"
        slidesPerView="auto"
        centeredSlides={true}
        spaceBetween={0}
        pagination={{ clickable: true }}
        navigation
        loop={true}
        watchSlidesProgress={true}
        className={styles.swiper}
        breakpoints={{
          320: { slidesPerView: 1.2, spaceBetween: 0 },
          480: { slidesPerView: 2.2, spaceBetween: 0 },
          768: { slidesPerView: 3, spaceBetween: 0 },
        }}
      >
        {filteredItems.map((item) => (
          <SwiperSlide key={item.id} onClick={() => openModal(item)} className={styles.slide}>
            <div className={styles.card}>
              <div className={styles.image}>
                <img src={item.image} alt={item.title} />
              </div>
              <h3>{item.title}</h3>
              <div className={styles.price}>
                {item.price} <span>{item.duration}</span>
              </div>
              <div className={styles.tags}>
                {item.tags.slice(0, 2).map((tag, idx) => (
                  <span key={idx} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Модальное окно с деталями */}
      {isModalOpen && selectedItem && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>✕</button>
            <div
              className={styles.modalImage}
              onClick={() => openFullImage(selectedItem.image)}
              style={{ cursor: 'pointer' }}
            >
              <img src={selectedItem.image} alt={selectedItem.title} />
            </div>
            <h3>{selectedItem.title}</h3>
            <div className={styles.modalPrice}>
              {selectedItem.price} <span>{selectedItem.duration}</span>
            </div>
            <p className={styles.modalDescription}>{selectedItem.description}</p>
            <div className={styles.modalTags}>
              {selectedItem.tags.map((tag, idx) => (
                <span key={idx} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Полноэкранное модальное окно для изображения */}
      {fullImage && (
        <div className={styles.fullImageOverlay} onClick={closeFullImage}>
          <div className={styles.fullImageContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.fullImageClose} onClick={closeFullImage}>×</button>
            <img src={fullImage} alt="Полноэкранное изображение" />
          </div>
        </div>
      )}
    </section>
  );
};

export default Catalog;