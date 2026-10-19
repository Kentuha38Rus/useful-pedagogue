const jwt = require('jsonwebtoken');
const { Message, User } = require('../models');
const ChatService = require('../services/chatService');
const { accessSecret } = require('../config/jwt');

module.exports = (io) => {
  // 🔥 Аутентификация до connection
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, accessSecret);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'role'],
      });
      if (!user) return next(new Error('User not found'));

      socket.userId = String(user.id);
      socket.userRole = user.role;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const role = socket.userRole;

    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    socket.on('join_chat', (chatId) => {
      const parts = String(chatId).split('_');
      if (!parts.includes(userId) && role !== 'admin') {
        socket.emit('error', 'Access denied to chat');
        return;
      }
      socket.join(`chat_${chatId}`);
    });

    socket.on('send_message', async (data) => {
      try {
        const { receiver_id, content } = data || {};
        if (!receiver_id || !content) {
          socket.emit('error', 'receiver_id and content required');
          return;
        }

        const chatId = ChatService.getChatId(userId, receiver_id);
        const message = await ChatService.sendMessage(chatId, userId, content, Message);

        const messageWithSender = await Message.findByPk(message.id, {
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
          ],
        });

        io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
        io.to(`user:${receiver_id}`).emit('new_message', messageWithSender);
        socket.emit('message_sent', messageWithSender);
      } catch (e) {
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('mark_read', async ({ messageId } = {}) => {
      try {
        if (!messageId) return;
        const message = await Message.findByPk(messageId);
        if (!message) return;

        const parts = String(message.chat_id).split('_');
        if (!parts.includes(userId) && role !== 'admin') return;
        if (String(message.sender_id) === userId) return;

        await message.update({ is_read: true, read_at: new Date() });
        io.to(`chat_${message.chat_id}`).emit('message_read', {
          messageId,
          userId,
        });
      } catch (_) {
        // noop
      }
    });
  });
};