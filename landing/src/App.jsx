import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/Landing/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import CookieBanner from './components/common/CookieBanner'; // <-- Импортируем
import './App.scss';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="landing-app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
        
        {/* Баннер рендерится поверх всех страниц */}
        <CookieBanner /> 
      </div>
    </BrowserRouter>
  );
}

export default App;