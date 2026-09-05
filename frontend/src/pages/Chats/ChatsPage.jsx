import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ChatList from '../../components/chat/ChatList';
import ChatWindow from '../../components/chat/ChatWindow';
import styles from './ChatsPage.module.scss';

const ChatsPage = () => {
  return (
    <div className={styles.chatsPage}>
      <Routes>
        <Route index element={<ChatList />} />
        <Route path=":dialogId" element={<ChatWindow />} />
      </Routes>
    </div>
  );
};

export default ChatsPage;