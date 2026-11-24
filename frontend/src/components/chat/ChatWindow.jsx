import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  fetchMessages,
  sendMessage,
  setActiveChat,
  clearActiveChat,
  markMessageAsRead,
  getOtherUserId,
} from '../../store/slices/chatSlice';
import { ensureSocketConnected, getSocket } from '../../utils/socket';
import MessageInput from './MessageInput';

const formatTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const extractChatId = (params, pathname) => {
  if (params?.chatId) return params.chatId;
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
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const chatId = extractChatId(params, location.pathname);

  const { messages, loading } = useSelector((state) => state.chat);
  const myUserId = useSelector((state) => state.auth.user?.id);
  const messagesEndRef = useRef(null);
  const [sendError, setSendError] = useState('');

  const otherUserId = chatId ? getOtherUserId(chatId, myUserId) : null;
  const replyIntent = searchParams.get('reply') === '1';

  useEffect(() => {
    if (!chatId) return;
    dispatch(setActiveChat(chatId));
    dispatch(fetchMessages(chatId));
    return () => {
      dispatch(clearActiveChat());
    };
  }, [dispatch, chatId]);

  // Подписываемся на комнату чата, чтобы получать новые сообщения
  useEffect(() => {
    if (!chatId || !myUserId) return undefined;

    const socket = getSocket(myUserId);
    if (!socket) return undefined;

    const join = () => socket.emit('join_chat', chatId);
    join();
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
    };
  }, [chatId, myUserId]);

  // Если сокет отвалился (например, iPhone после фона) — добираем сообщения
  // обычными запросами, чтобы чат не «замирал».
  useEffect(() => {
    if (!chatId) return undefined;

    const refresh = () => dispatch(fetchMessages(chatId));

    // Страховка на случай «полуживого» сокета (частая ситуация на iOS):
    // раз в 10 секунд подтягиваем сообщения обычным запросом.
    const interval = setInterval(refresh, 10000);

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        ensureSocketConnected();
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, [chatId, myUserId, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Скроллим только при появлении новых сообщений, а не при каждом опросе
  }, [messages.length]);

  useEffect(() => {
    if (!myUserId) return;
    messages.forEach((m) => {
      const isIncoming = String(m.sender_id) !== String(myUserId);
      if (
        isIncoming &&
        !m.is_read &&
        !m.is_system &&
        m.id &&
        !String(m.id).startsWith('local-')
      ) {
        dispatch(markMessageAsRead(m.id));
      }
    });
  }, [messages, myUserId, dispatch]);

  useEffect(() => {
    if (!replyIntent) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('reply');
      setSearchParams(next, { replace: true });
    }, 2000);
    return () => clearTimeout(t);
  }, [replyIntent, searchParams, setSearchParams]);

  const handleSend = async (text) => {
    if (!otherUserId) {
      console.error('[chat] receiver not found for chat', chatId);
      setSendError('Не найден получатель сообщения');
      return false;
    }

    setSendError('');
    try {
      await dispatch(
        sendMessage({ receiverId: otherUserId, content: text })
      ).unwrap();
      return true;
    } catch (err) {
      setSendError(
        typeof err === 'string' ? err : 'Не удалось отправить сообщение'
      );
      return false;
    }
  };

  if (!chatId) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
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
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        minWidth: 0,
      }}
    >
      {replyIntent && (
        <div
          style={{
            padding: '10px 16px',
            background: '#fef3c7',
            color: '#92400e',
            fontSize: 13,
            borderBottom: '1px solid #fde68a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>✍️ Напишите администратору по поводу занятия — сообщение уйдёт в чат.</span>
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('reply');
              setSearchParams(next, { replace: true });
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#92400e',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Скрыть"
          >×</button>
        </div>
      )}

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
          // Системное сообщение — по центру, курсив, серо-жёлтый фон
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

      {sendError && (
        <div
          style={{
            padding: '8px 16px',
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: 13,
          }}
        >
          ⚠️ {sendError}
        </div>
      )}

      <MessageInput onSend={handleSend} autoFocus={replyIntent} />
    </div>
  );
};

export default ChatWindow;