import React, { useState } from 'react';
import PublicHeader from '../../components/navigation/PublicHeader';
import Hero from './components/Hero';
import About from './components/About';
import Catalog from './components/Catalog';
import Photos from './components/Photos';
import Contacts from './components/Contacts';
import CtaSection from './components/CtaSection';
import Footer from './components/Footer';
import DiagnosticModal from './components/DiagnosticModal';
import styles from './LandingPage.module.scss';

const LandingPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className={styles.landing}>
      <PublicHeader onDiagnosticClick={openModal} />
      <Hero onDiagnosticClick={openModal} />
      <About />
      <Catalog />
      <Photos />
      <Contacts />
      <CtaSection onDiagnosticClick={openModal} />
      <Footer />
      <DiagnosticModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
};

export default LandingPage;