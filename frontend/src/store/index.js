import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import scheduleReducer from './slices/scheduleSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    schedule: scheduleReducer,
  },
});

export default store;