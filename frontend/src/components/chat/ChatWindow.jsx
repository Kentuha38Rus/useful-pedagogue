import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { fetchMessages, sendMessage, markAsRead } from '../../store/slices/chatSlice';
import MessageInput from './MessageInput';
import styles from './ChatWindow.module.scss';

const ChatWindow = () => {
  const { dialogId } = useParams();
  const dispatch = useDispatch();
  const { messages, loading } = useSelector((state) => state.chat);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (dialogId) {
      dispatch(fetchMessages(dialogId));
      dispatch(markAsRead(dialogId));
    }
  }, [dispatch, dialogId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text) => {
    dispatch(sendMessage({ dialogId, text }));
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  return (
    <div className={styles.chatWindow}>
      <div className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.message} ${msg.isOwn ? styles.own : styles.other}`}>
            <div className={styles.bubble}>{msg.text}</div>
            <div className={styles.time}>{new Date(msg.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
};

export default ChatWindow;