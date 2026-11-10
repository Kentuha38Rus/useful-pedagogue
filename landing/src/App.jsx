import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/Landing/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import './App.scss';

function App() {
  return (
    // Добавлен пропс future для устранения предупреждений о версии v7
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="landing-app">
        <Routes>
          {/* Главная страница лендинга */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Страница Политики конфиденциальности */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;