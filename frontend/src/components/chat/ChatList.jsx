import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDialogs, deleteChat } from '../../store/slices/chatSlice';
import Card from '../common/Card';
import api from '../../utils/api';
import styles from './ChatList.module.scss';

const roleLabel = (role) => {
  switch (role) {
    case 'admin': return 'админ';
    case 'teacher': return 'педагог';
    case 'parent': return 'родитель';
    case 'system': return 'система';
    case 'broadcast': return 'рассылка';
    default: return role || '';
  }
};

const ChatList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dialogs, activeChatId } = useSelector((state) => state.chat);
  const myUserId = useSelector((state) => state.auth.user?.id);
  const myRole = useSelector((state) => state.auth.user?.role);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    dispatch(fetchDialogs());

    // Страховка для iOS: если сокет «заснул», обновляем список диалогов
    const interval = setInterval(() => dispatch(fetchDialogs()), 15000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const openChat = (chatId) => {
    navigate(`/app/chats/${chatId}`);
  };

  // Родителю и педагогу — быстрый вход в личный чат с администратором.
  const handleWriteAdmin = async () => {
    if (starting || !myUserId) return;
    setStarting(true);
    try {
      const { data } = await api.get('/users/admins');
      const admin = Array.isArray(data) && data.length ? data[0] : null;
      if (!admin) {
        window.alert('В школе не найден администратор');
        return;
      }
      const chatId = [String(myUserId), String(admin.id)].sort().join('_');
      navigate(`/app/chats/${chatId}`);
    } catch (err) {
      window.alert('Не удалось открыть чат с администратором');
    } finally {
      setStarting(false);
    }
  };

  const writeAdminButton =
    myRole === 'admin' ? null : (
      <button
        type="button"
        className={styles.writeAdmin}
        onClick={handleWriteAdmin}
        disabled={starting || !myUserId}
      >
        {starting ? 'Открываем...' : '✍️ Написать администратору'}
      </button>
    );

  const handleDelete = (event, dialog) => {
    event.stopPropagation();
    if (
      !window.confirm(
        'Удалить чат из своей истории? У собеседника он останется.'
      )
    ) {
      return;
    }

    dispatch(deleteChat(dialog.chat_id))
      .unwrap()
      .then(() => {
        if (activeChatId === dialog.chat_id) navigate('/app/chats');
      })
      .catch((err) => {
        window.alert(
          typeof err === 'string' ? err : 'Не удалось удалить чат'
        );
      });
  };

  if (!dialogs || dialogs.length === 0) {
    return (
      <div className={styles.chatList}>
        {writeAdminButton}
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
      {writeAdminButton}
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
            <button
              type="button"
              title="Удалить чат"
              className={styles.deleteButton}
              onClick={(event) => handleDelete(event, dialog)}
            >
              ×
            </button>
          </Card>
        );
      })}
    </div>
  );
};

export default ChatList;