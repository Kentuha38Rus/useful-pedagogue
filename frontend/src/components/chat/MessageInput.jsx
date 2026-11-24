import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSend, autoFocus = false }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  // Автофокус, если пришли из push с ?reply=1
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const sent = await onSend(trimmed);
      // Очищаем поле только если сообщение реально отправлено
      if (sent !== false) setText('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: 12,
        borderTop: '1px solid #e2e8f0',
        background: '#fff',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Введите сообщение..."
        style={{
          flex: 1,
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || sending}
        style={{
          padding: '10px 20px',
          border: 'none',
          borderRadius: 8,
          background: text.trim() && !sending ? '#4A90E2' : '#cbd5e1',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
        }}
      >
        {sending ? 'Отправка...' : 'Отправить'}
      </button>
    </div>
  );
};

export default MessageInput;