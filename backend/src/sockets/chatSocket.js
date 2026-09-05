const { Message, User } = require('../models');
const ChatService = require('../services/chatService');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    const userId = socket.handshake.query.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }
    socket.userId = userId;

    socket.on('join_chat', (chatId) => {
      const parts = chatId.split('_');
      if (parts.includes(userId.toString())) {
        socket.join(`chat_${chatId}`);
        console.log(`User ${userId} joined chat ${chatId}`);
      } else {
        socket.emit('error', 'Access denied to chat');
      }
    });

    socket.on('send_message', async (data) => {
      const { receiver_id, content } = data;
      if (!receiver_id || !content) {
        socket.emit('error', 'receiver_id and content required');
        return;
      }
      const senderId = socket.userId;
      const chatId = ChatService.getChatId(senderId, receiver_id);
      const message = await ChatService.sendMessage(chatId, senderId, content, Message);
      const messageWithSender = await Message.findByPk(message.id, {
        include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
      });
      io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
      socket.emit('message_sent', messageWithSender);
    });

    socket.on('mark_read', async (data) => {
      const { messageId } = data;
      // аналогично REST, можно вызвать тот же контроллер или дублировать логику
      try {
        const message = await Message.findByPk(messageId);
        if (!message) return;
        const chatId = message.chat_id;
        const parts = chatId.split('_');
        if (!parts.includes(userId.toString())) return;
        if (message.sender_id === parseInt(userId)) return;
        await message.update({ is_read: true, read_at: new Date() });
        io.to(`chat_${chatId}`).emit('message_read', { messageId, userId });
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });
};