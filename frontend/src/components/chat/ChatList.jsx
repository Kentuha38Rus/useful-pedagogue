import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDialogs } from '../../store/slices/chatSlice';
import Card from '../common/Card';
import styles from './ChatList.module.scss';

const roleLabel = (role) => {
  switch (role) {
    case 'admin': return 'админ';
    case 'teacher': return 'педагог';
    case 'parent': return 'родитель';
    default: return role || '';
  }
};

const ChatList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dialogs, activeChatId } = useSelector((state) => state.chat);

  useEffect(() => {
    dispatch(fetchDialogs());
  }, [dispatch]);

  const openChat = (chatId) => {
    navigate(`/app/chats/${chatId}`);
  };

  if (!dialogs || dialogs.length === 0) {
    return (
      <div className={styles.chatList}>
        <Card className={styles.dialogCard}>
          <div className={styles.info}>
            <div className={styles.name}>Пока нет диалогов</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.chatList}>
      {dialogs.map((dialog) => {
        const other = dialog.other_user || {};
        const last = dialog.last_message;
        const isActive = activeChatId === dialog.chat_id;

        return (
          <Card
            key={dialog.chat_id}
            className={styles.dialogCard}
            onClick={() => openChat(dialog.chat_id)}
            style={isActive ? { background: '#eff6ff' } : undefined}
          >
            <div className={styles.avatar}>
              {(other.name || '?')[0]?.toUpperCase()}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>
                {other.name || 'Без имени'}
                {other.role ? ` · ${roleLabel(other.role)}` : ''}
              </div>
              <div className={styles.lastMessage}>
                {last?.content || 'Нет сообщений'}
              </div>
            </div>
            {dialog.unread_count > 0 && (
              <span className={styles.unread}>{dialog.unread_count}</span>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default ChatList;