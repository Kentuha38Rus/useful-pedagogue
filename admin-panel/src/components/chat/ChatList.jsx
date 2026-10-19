import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDialogs } from '../../store/slices/chatSlice';

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
    navigate(`/chats/${chatId}`);
  };

  if (!dialogs || dialogs.length === 0) {
    return (
      <div
        style={{
          width: 320,
          borderRight: '1px solid #e2e8f0',
          padding: 20,
          color: '#94a3b8',
          fontSize: 14,
        }}
      >
        Пока нет диалогов
      </div>
    );
  }

  return (
    <div
      style={{
        width: 320,
        borderRight: '1px solid #e2e8f0',
        overflowY: 'auto',
        background: '#fff',
      }}
    >
      {dialogs.map((dialog) => {
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
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;