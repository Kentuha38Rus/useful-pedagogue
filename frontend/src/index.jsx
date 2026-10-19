import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import store from './store';
import { NotificationProvider } from './context/NotificationContext';
import './assets/styles/global.scss';
import './assets/styles/typography.scss';

// Автоматически подхватывает base из vite.config.js (/useful-pedagogue/)
const base = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter
        basename={base}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);