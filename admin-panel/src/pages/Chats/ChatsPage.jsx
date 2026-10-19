import React from 'react';
import ChatList from '../../components/chat/ChatList';
import ChatWindow from '../../components/chat/ChatWindow';

const ChatsPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 40px)',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <ChatList />
      <ChatWindow />
    </div>
  );
};

export default ChatsPage;