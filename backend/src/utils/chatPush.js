const notificationService = require('../services/notificationService');

function isUserOnline(io, userId) {
  if (!io || !userId) return false;
  try {
    const room = io.sockets.adapter.rooms.get(`user:${userId}`);
    return Boolean(room && room.size > 0);
  } catch (_) {
    return false;
  }
}

/**
 * Пуш о новом сообщении в чате — только если у получателя нет открытого
 * приложения (нет активного socket-подключения).
 */
async function sendChatPush({ io, receiver, sender, chatId, content, tenantId }) {
  if (!io || !receiver?.id || !tenantId) return;
  if (isUserOnline(io, receiver.id)) return;

  const isAdmin = receiver.role === 'admin';
  const url = isAdmin ? `chats/${chatId}` : `app/chats/${chatId}`;
  const senderName = sender?.name || (isAdmin ? 'Пользователь' : 'Администратор');
  const body = `${senderName}: ${String(content || '').slice(0, 200)}`;

  try {
    await notificationService.sendToUser(receiver.id, tenantId, {
      title: 'Новое сообщение',
      body,
      tag: `chat-${chatId}`,
      data: { type: 'chat_message', chatId, url },
    });
  } catch (error) {
    console.error('[chat-push] send error:', error.message);
  }
}

module.exports = { sendChatPush, isUserOnline };
