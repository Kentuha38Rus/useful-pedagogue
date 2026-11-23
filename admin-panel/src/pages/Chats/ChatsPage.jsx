import React from 'react';
import { useParams } from 'react-router-dom';
import ChatList from '../../components/chat/ChatList';
import ChatWindow from '../../components/chat/ChatWindow';

const ChatsPage = () => {
  const { chatId } = useParams();

  // На телефоне показываем либо список диалогов, либо открытый диалог
  return (
    <div className={`chat-page${chatId ? ' chat-page--open' : ''}`}>
      <ChatList />
      <ChatWindow />
    </div>
  );
};

export default ChatsPage;
