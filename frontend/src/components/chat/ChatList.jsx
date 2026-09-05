import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import styles from './ChatList.module.scss';

const ChatList = () => {
  const { dialogs } = useSelector((state) => state.chat);
  const navigate = useNavigate();

  const openChat = (dialogId) => {
    navigate(`/chats/${dialogId}`);
  };

  return (
    <div className={styles.chatList}>
      {dialogs.map((dialog) => (
        <Card key={dialog.id} className={styles.dialogCard} onClick={() => openChat(dialog.id)}>
          <div className={styles.avatar}>{dialog.participant.name[0]}</div>
          <div className={styles.info}>
            <div className={styles.name}>{dialog.participant.name}</div>
            <div className={styles.lastMessage}>{dialog.lastMessage?.text || 'Нет сообщений'}</div>
          </div>
          {dialog.unreadCount > 0 && <span className={styles.unread}>{dialog.unreadCount}</span>}
        </Card>
      ))}
    </div>
  );
};

export default ChatList;