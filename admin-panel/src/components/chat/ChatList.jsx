import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDialogs, deleteChat } from '../../store/slices/chatSlice';
import ChatComposerModal from './ChatComposerModal';

const roleLabel = (role) => {
  switch (role) {
    case 'admin':
      return 'админ';
    case 'teacher':
      return 'педагог';
    case 'parent':
      return 'родитель';
    case 'system':
      return 'система';
    case 'broadcast':
      return 'рассылка';
    default:
      return role || '';
  }
};

const ChatList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dialogs, activeChatId } = useSelector((state) => state.chat);
  const adminId = useSelector((state) => state.auth.user?.id);
  const [composerMode, setComposerMode] = useState(null);

  useEffect(() => {
    dispatch(fetchDialogs());
  }, [dispatch]);

  const openChat = (chatId) => {
    navigate(`/chats/${chatId}`);
  };

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
        if (activeChatId === dialog.chat_id) navigate('/chats');
      })
      .catch((err) => {
        window.alert(
          typeof err === 'string' ? err : 'Не удалось удалить чат'
        );
      });
  };

  const openDialog = (user) => {
    const chatId = [String(adminId), String(user.id)].sort().join('_');
    navigate(`/chats/${chatId}`, { state: { otherUser: user } });
    setComposerMode(null);
  };

  return (
    <div className="chat-list">
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          background: '#fff',
        }}
      >
        <button
          type="button"
          onClick={() => setComposerMode('dialog')}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + Новый диалог
        </button>
        <button
          type="button"
          onClick={() => setComposerMode('broadcast')}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          📢 Рассылка
        </button>
      </div>

      {!dialogs || dialogs.length === 0 ? (
        <div
          style={{
            padding: 20,
            color: '#94a3b8',
            fontSize: 14,
          }}
        >
          Пока нет диалогов
        </div>
      ) : (
        dialogs.map((dialog) => {
          const other = dialog.other_user || {};
          const last = dialog.last_message;
          const isActive = activeChatId === dialog.chat_id;

          return (
            <div
              key={dialog.chat_id}
              onClick={() => openChat(dialog.chat_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                background: isActive ? '#eff6ff' : 'transparent',
                transition: 'background .15s',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#4A90E2',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {(other.name || '?')[0]?.toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {other.name || 'Без имени'}
                  </div>
                  {other.role && (
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {roleLabel(other.role)}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: 2,
                  }}
                >
                  {last?.content || 'Нет сообщений'}
                </div>
              </div>

              {dialog.unread_count > 0 && (
                <div
                  style={{
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 10,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {dialog.unread_count}
                </div>
              )}

              <button
                type="button"
                title="Удалить чат"
                onClick={(event) => handleDelete(event, dialog)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '0 4px',
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          );
        })
      )}

      <ChatComposerModal
        isOpen={!!composerMode}
        mode={composerMode}
        onClose={() => setComposerMode(null)}
        onOpenDialog={openDialog}
        onBroadcastDone={(message) => {
          window.alert(message);
          dispatch(fetchDialogs());
        }}
      />
    </div>
  );
};

export default ChatList;
