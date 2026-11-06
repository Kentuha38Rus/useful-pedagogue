const jwt = require('jsonwebtoken');
const { Message, User } = require('../models');
const ChatService = require('../services/chatService');
const { accessSecret } = require('../config/jwt');

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, accessSecret);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'role', 'tenantId'],
      });
      if (!user) return next(new Error('User not found'));

      // Проверка соответствия JWT и БД (защита от старого токена)
      if ((decoded.tid || null) !== (user.tenantId || null)) {
        return next(new Error('Token tenant mismatch'));
      }

      socket.userId = String(user.id);
      socket.userRole = user.role;
      socket.userTenantId = user.tenantId ? String(user.tenantId) : null;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const role = socket.userRole;
    const tenantId = socket.userTenantId;

    // Личная комната (безопасна — user уникален в БД)
    socket.join(`user:${userId}`);

    // Комнаты, привязанные к тенанту
    if (tenantId) {
      socket.join(`tenant:${tenantId}:role:${role}`);
      socket.join(`tenant:${tenantId}:user:${userId}`);
    }

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
        if (!tenantId) {
          socket.emit('error', 'Tenant context required');
          return;
        }

        // Проверка, что получатель в этом же тенанте
        const receiver = await User.findOne({
          where: { id: receiver_id, tenantId },
          attributes: ['id'],
        });
        if (!receiver) {
          socket.emit('error', 'Invalid receiver');
          return;
        }

        const chatId = ChatService.getChatId(userId, receiver_id);
        const message = await ChatService.sendMessage(chatId, userId, content, tenantId, Message);

        const messageWithSender = await Message.findOne({
          where: { id: message.id, tenant_id: tenantId },
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
        if (!messageId || !tenantId) return;
        const message = await Message.findOne({
          where: { id: messageId, tenant_id: tenantId },
        });
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