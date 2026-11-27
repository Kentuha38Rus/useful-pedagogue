import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  fetchMessages,
  sendMessage,
  setActiveChat,
  clearActiveChat,
  markMessageAsRead,
  getOtherUserId,
} from '../../store/slices/chatSlice';
import MessageInput from './MessageInput';

const formatTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const extractChatId = (params, pathname) => {
  if (params?.chatId) return params.chatId;
  if (params?.dialogId) return params.dialogId;
  if (params && params['*']) {
    const v = params['*'];
    if (v) return String(v).split('/')[0];
  }
  const parts = String(pathname || '').split('/').filter(Boolean);
  const idx = parts.indexOf('chats');
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return null;
};

const ChatWindow = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const chatId = extractChatId(params, location.pathname);

  const { messages, loading, dialogs } = useSelector((state) => state.chat);
  const myUserId = useSelector((state) => state.auth.user?.id);
  const messagesEndRef = useRef(null);

  // Имя собеседника для шапки диалога на телефоне
  const currentDialog = (dialogs || []).find(
    (d) => String(d.chat_id) === String(chatId)
  );
  const dialogUser = location.state?.otherUser;
  const isReadOnlyChat =
    String(chatId || '').startsWith('auto_') ||
    String(chatId || '').startsWith('broadcast_');
  const specialTitle = String(chatId || '').startsWith('auto_')
    ? 'Автоуведомления'
    : String(chatId || '').startsWith('broadcast_')
    ? 'Рассылки'
    : null;
  const dialogTitle =
    currentDialog?.other_user?.name ||
    dialogUser?.name ||
    specialTitle ||
    'Диалог';

  const otherUserId = chatId ? getOtherUserId(chatId, myUserId) : null;

  useEffect(() => {
    if (!chatId) return;
    dispatch(setActiveChat(chatId));
    dispatch(fetchMessages(chatId));
    return () => {
      dispatch(clearActiveChat());
    };
  }, [dispatch, chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!myUserId) return;
    messages.forEach((m) => {
      const isIncoming = String(m.sender_id) !== String(myUserId);
      if (
        isIncoming &&
        !m.is_read &&
        (!m.is_system || String(chatId).startsWith('auto_')) &&
        m.id &&
        !String(m.id).startsWith('local-')
      ) {
        dispatch(markMessageAsRead(m.id));
      }
    });
  }, [messages, myUserId, dispatch]);

  const handleSend = (text) => {
    if (!otherUserId) {
      console.error('[chat] receiver not found for chat', chatId);
      return;
    }
    dispatch(sendMessage({ receiverId: otherUserId, content: text }));
  };

  if (!chatId) {
    return (
      <div
        className="chat-window"
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 14,
        }}
      >
        Выберите диалог слева
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button
          type="button"
          className="chat-back"
          aria-label="Назад к списку диалогов"
          onClick={() => navigate('/chats')}
        >
          ←
        </button>
        <div className="chat-header__title">{dialogTitle}</div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {loading && messages.length === 0 && (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
            Загрузка...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
            Сообщений пока нет
          </div>
        )}

        {messages.map((msg) => {
          if (msg.is_system) {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '8px 14px',
                    borderRadius: 12,
                    background: '#fef3c7',
                    color: '#78350f',
                    fontSize: 13,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    border: '1px dashed #fcd34d',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <div>{msg.content}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    {formatTime(msg.created_at || msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          }

          const isOwn = String(msg.sender_id) === String(myUserId);
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                className="message-bubble"
                style={{
                  maxWidth: '70%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: isOwn ? '#4A90E2' : '#fff',
                  color: isOwn ? '#fff' : '#0f172a',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.4 }}>{msg.content}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                  {formatTime(msg.created_at || msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {isReadOnlyChat ? (
        <div
          style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            color: '#64748b',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {String(chatId || '').startsWith('auto_')
            ? 'Чат автоуведомлений — ответить нельзя.'
            : 'Чат рассылок — ответить нельзя.'}
        </div>
      ) : (
        <MessageInput onSend={handleSend} />
      )}
    </div>
  );
};

export default ChatWindow;