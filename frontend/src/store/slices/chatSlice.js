import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';

// Инициализация: используем общий singleton-сокет
export const initSocket = () => (dispatch, getState) => {
  const userId = getState().auth.user?.id;
  if (!userId) {
    console.warn('[chat] initSocket: user not loaded yet');
    return;
  }
  const socket = getSocket(userId);
  if (!socket) return;

  // Снимаем предыдущие слушатели, чтобы не задваивать
  socket.off('new_message');
  socket.off('message_read');

  socket.on('new_message', (message) => {
    console.log('[chat] new_message', message);
    dispatch(addMessage({ message, myUserId: userId }));
  });

  socket.on('message_read', (data) => {
    dispatch(markAsReadSuccess(data));
  });
};

// chat_id = "min_max" — вычисляем «собеседника»
export const getOtherUserId = (chatId, myUserId) => {
  const parts = String(chatId).split('_');
  if (parts.length !== 2) return null;
  return parts[0] === String(myUserId) ? parts[1] : parts[0];
};

export const fetchDialogs = createAsyncThunk('chat/fetchDialogs', async () => {
  const res = await api.get('/messages/chats');
  return res.data;
});

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (chatId) => {
    const res = await api.get(`/messages/chat/${chatId}`);
    // Бэкенд: findAndCountAll → { count, rows } | на всякий случай
    const messages = Array.isArray(res.data)
      ? res.data
      : res.data.messages || res.data.rows || [];
    return { chatId, messages };
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ receiverId, content }, { getState }) => {
    const userId = getState().auth.user?.id;
    const socket = getSocket(userId);
    if (!socket) throw new Error('Socket not connected');

    socket.emit('send_message', {
      receiver_id: receiverId,
      content,
    });

    return {
      chat_id: [String(userId), String(receiverId)].sort().join('_'),
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      isOwn: true,
    };
  }
);

// Эмитим mark_read для конкретного сообщения
export const markMessageAsRead = (messageId) => (dispatch, getState) => {
  const userId = getState().auth.user?.id;
  const socket = getSocket(userId);
  if (socket) {
    socket.emit('mark_read', { messageId });
  }
};

// Отмечаем прочитанными все входящие в активном чате
export const markDialogAsRead = () => (dispatch, getState) => {
  const { messages, activeChatId } = getState().chat;
  const myId = getState().auth.user?.id;
  if (!activeChatId || !myId) return;

  const socket = getSocket(myId);
  if (!socket) return;

  messages.forEach((m) => {
    if (!m.is_read && String(m.sender_id) !== String(myId)) {
      socket.emit('mark_read', { messageId: m.id });
    }
  });
};

const initialState = {
  dialogs: [],       // [{ chat_id, other_user, last_message, unread_count }]
  messages: [],      // активный диалог
  activeChatId: null,
  loading: false,
  unreadTotal: 0,
};

const recalcUnread = (state) => {
  state.unreadTotal = state.dialogs.reduce(
    (acc, d) => acc + (d.unread_count || 0),
    0
  );
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      const { message, myUserId } = action.payload;
      if (!message) return;

      const chatId = message.chat_id;
      const isOwn = String(message.sender_id) === String(myUserId);

      // 1. Обновляем/создаём диалог
      let dialog = state.dialogs.find((d) => d.chat_id === chatId);
      if (!dialog) {
        dialog = {
          chat_id: chatId,
          other_user: message.sender || null,
          last_message: message,
          unread_count: 0,
        };
        state.dialogs.unshift(dialog);
      } else {
        dialog.last_message = message;
        if (!isOwn && state.activeChatId !== chatId) {
          dialog.unread_count = (dialog.unread_count || 0) + 1;
        }
      }

      // 2. Если открыт этот чат — добавляем в ленту
      if (state.activeChatId === chatId) {
        state.messages.push(message);
      }

      recalcUnread(state);
    },

    setActiveChat: (state, action) => {
      state.activeChatId = action.payload;
      const dialog = state.dialogs.find((d) => d.chat_id === action.payload);
      if (dialog) dialog.unread_count = 0;
      recalcUnread(state);
    },

    clearActiveChat: (state) => {
      state.activeChatId = null;
      state.messages = [];
    },

    markAsReadSuccess: (state, action) => {
      const { messageId } = action.payload || {};
      const msg = state.messages.find((m) => m.id === messageId);
      if (msg && !msg.is_read) {
        msg.is_read = true;

        // Уменьшаем счётчик диалога и общий счётчик
        const dialog = state.dialogs.find((d) => d.chat_id === msg.chat_id);
        if (dialog && (dialog.unread_count || 0) > 0) {
          dialog.unread_count = Math.max(0, dialog.unread_count - 1);
        }
        recalcUnread(state);
      }
    },

    markAllAsRead: (state) => {
      state.dialogs.forEach((d) => (d.unread_count = 0));
      state.unreadTotal = 0;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchDialogs.fulfilled, (state, action) => {
        state.dialogs = action.payload || [];

        // Если сейчас открыт диалог — считаем его прочитанным
        if (state.activeChatId) {
          const activeDialog = state.dialogs.find(
            (d) => d.chat_id === state.activeChatId
          );
          if (activeDialog) activeDialog.unread_count = 0;
        }

        recalcUnread(state);
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload.messages || [];
        state.activeChatId = action.payload.chatId;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        state.messages.push({ ...msg, id: `local-${Date.now()}` });
      });
  },
});

export const {
  addMessage,
  setActiveChat,
  clearActiveChat,
  markAsReadSuccess,
  markAllAsRead,
} = chatSlice.actions;
export default chatSlice.reducer;