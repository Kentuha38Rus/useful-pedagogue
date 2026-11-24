import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';

// Инициализация: используем общий singleton-сокет
export const initSocket = () => (dispatch, getState) => {
  const { user } = getState().auth;
  const userId = user?.id;

  if (!userId) {
    console.warn('[chat] initSocket: user not loaded yet');
    return;
  }
  if (user?.role === 'platform_admin') {
    console.log('[chat] initSocket skipped for platform_admin');
    return;
  }

  const socket = getSocket(userId);
  if (!socket) return;

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

export const getOtherUserId = (chatId, myUserId) => {
  const parts = String(chatId).split('_');
  if (parts.length !== 2) return null;
  return parts[0] === String(myUserId) ? parts[1] : parts[0];
};

export const fetchDialogs = createAsyncThunk(
  'chat/fetchDialogs',
  async (_, thunkAPI) => {
    const { user } = thunkAPI.getState().auth;
    if (user?.role === 'platform_admin') {
      return []; // ← ФИКС: platform_admin не грузит диалоги
    }
    const res = await api.get('/messages/chats');
    return res.data;
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (chatId) => {
    const res = await api.get(`/messages/chat/${chatId}`);
    const messages = Array.isArray(res.data)
      ? res.data
      : res.data.messages || res.data.rows || [];
    return { chatId, messages };
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ receiverId, content }, { rejectWithValue }) => {
    try {
      // Отправляем через REST: работает даже если сокет отвалился
      const res = await api.post('/messages', {
        receiver_id: receiverId,
        content,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Не удалось отправить сообщение'
      );
    }
  }
);

export const markMessageAsRead = (messageId) => (dispatch, getState) => {
  const userId = getState().auth.user?.id;
  const socket = getSocket(userId);
  if (socket) {
    socket.emit('mark_read', { messageId });
  }
};

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
  dialogs: [],
  messages: [],
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

      let dialog = state.dialogs.find((d) => d.chat_id === chatId);
      if (!dialog) {
        dialog = {
          chat_id: chatId,
          other_user: isOwn ? null : message.sender || null,
          last_message: message,
          unread_count:
            !isOwn && state.activeChatId !== chatId ? 1 : 0,
        };
        state.dialogs.unshift(dialog);
      } else {
        dialog.last_message = message;
        if (!isOwn && state.activeChatId !== chatId) {
          dialog.unread_count = (dialog.unread_count || 0) + 1;
        }
      }

      if (state.activeChatId === chatId) {
        // Одно и то же сообщение может прийти и по REST, и по сокету
        const exists = state.messages.some((m) => m.id === message.id);
        if (!exists) state.messages.push(message);
      }

      recalcUnread(state);
    },

    setActiveChat: (state, action) => {
      if (state.activeChatId !== action.payload) {
        state.messages = [];
      }
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

        if (state.activeChatId) {
          const activeDialog = state.dialogs.find(
            (d) => d.chat_id === state.activeChatId
          );
          if (activeDialog) activeDialog.unread_count = 0;
        }

        recalcUnread(state);
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const incoming = action.payload.messages || [];
        const chatId = action.payload.chatId;

        if (state.activeChatId === chatId) {
          // Объединяем с уже показанными сообщениями: опрос не должен
          // «съедать» только что отправленное сообщение.
          const map = new Map();
          [...state.messages, ...incoming].forEach((message) => {
            map.set(message.id, message);
          });
          state.messages = Array.from(map.values()).sort((a, b) => {
            const left = new Date(a.created_at || a.createdAt || 0).getTime();
            const right = new Date(b.created_at || b.createdAt || 0).getTime();
            return left - right;
          });
        } else if (!state.activeChatId) {
          state.messages = incoming;
          state.activeChatId = chatId;
        }
        // Ответ для другого (уже закрытого) чата игнорируем
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        if (!msg) return;

        const dialog = state.dialogs.find((d) => d.chat_id === msg.chat_id);
        if (dialog) {
          dialog.last_message = msg;
        }

        if (state.activeChatId === msg.chat_id) {
          const exists = state.messages.some((m) => m.id === msg.id);
          if (!exists) state.messages.push(msg);
        }
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