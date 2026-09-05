import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import io from 'socket.io-client';
import { handleApiError } from '../../utils/helpers';

let socket = null;

export const initSocket = () => (dispatch) => {
  if (socket) socket.close();
  socket = io(import.meta.env.VITE_WS_URL, {
    auth: { token: localStorage.getItem('token') }
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('newMessage', (message) => {
    dispatch(addMessage(message));
  });
  socket.on('messageRead', (data) => {
    dispatch(markAsReadSuccess(data.dialogId));
  });
};

export const fetchDialogs = createAsyncThunk('chat/fetchDialogs', async () => {
  const res = await api.get('/chat/dialogs');
  return res.data;
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (dialogId) => {
  const res = await api.get(`/chat/dialogs/${dialogId}/messages`);
  return { dialogId, messages: res.data };
});

export const sendMessage = createAsyncThunk('chat/sendMessage', async ({ dialogId, text }) => {
  if (socket) {
    socket.emit('sendMessage', { dialogId, text });
    // временно добавим в стейт с isOwn=true
    return { dialogId, text, createdAt: new Date().toISOString(), isOwn: true };
  }
  throw new Error('Socket not connected');
});

export const markAsRead = (dialogId) => (dispatch) => {
  if (socket) {
    socket.emit('markRead', { dialogId });
  }
  dispatch(markAsReadSuccess(dialogId));
};

const initialState = {
  dialogs: [],
  messages: [],
  loading: false,
  unreadTotal: 0,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      const msg = action.payload;
      const dialog = state.dialogs.find(d => d.id === msg.dialogId);
      if (dialog) {
        dialog.lastMessage = msg;
        if (!msg.isOwn) dialog.unreadCount = (dialog.unreadCount || 0) + 1;
      }
      state.messages.push(msg);
    },
    markAsReadSuccess: (state, action) => {
      const dialog = state.dialogs.find(d => d.id === action.payload);
      if (dialog) dialog.unreadCount = 0;
    },
    markAllAsRead: (state) => {
      state.dialogs.forEach(d => d.unreadCount = 0);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDialogs.fulfilled, (state, action) => {
        state.dialogs = action.payload;
        state.unreadTotal = action.payload.reduce((acc, d) => acc + (d.unreadCount || 0), 0);
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        // добавляем отправленное сообщение в список
        const msg = action.payload;
        state.messages.push({ ...msg, id: Date.now() }); // временный id
      });
  }
});

export const { addMessage, markAsReadSuccess, markAllAsRead } = chatSlice.actions;
export default chatSlice.reducer;