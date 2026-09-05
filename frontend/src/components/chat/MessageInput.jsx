import React, { useState } from 'react';
import Button from '../common/Button';
import styles from './MessageInput.module.scss';

const MessageInput = ({ onSend }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form className={styles.inputForm} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.input}
        placeholder="Введите сообщение..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit" variant="primary" className={styles.sendBtn}>Отправить</Button>
    </form>
  );
};

export default MessageInput;