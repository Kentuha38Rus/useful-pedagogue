const ChatService = require('../services/chatService');
const { Message, User } = require('../models');
const { requireTenant } = require('../utils/helpers');

exports.getDialogs = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const userId = req.user.id;
    const dialogs = await ChatService.getDialogs(userId, tid, Message, User);
    res.json(dialogs);
  } catch (error) {
    next(error);
  }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    const parts = chatId.split('_');
    if (!parts.includes(userId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await ChatService.getChatHistory(
      chatId, tid, Message, User, parseInt(limit), parseInt(offset)
    );
    res.json({
      messages: result.rows,
      total: result.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { receiver_id, content } = req.body;
    const senderId = req.user.id;

    if (!receiver_id || !content) {
      return res.status(400).json({ error: 'receiver_id and content are required' });
    }

    const receiver = await User.findOne({ where: { id: receiver_id, tenantId: tid } });
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const chatId = ChatService.getChatId(senderId, receiver_id);
    const message = await ChatService.sendMessage(chatId, senderId, content, tid, Message);

    const messageWithSender = await Message.findOne({
      where: { id: message.id, tenant_id: tid },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'role'] }],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${chatId}`).emit('new_message', messageWithSender);
    }

    res.status(201).json(messageWithSender);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const tid = requireTenant(req);
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({ where: { id, tenant_id: tid } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const chatId = message.chat_id;
    const parts = chatId.split('_');
    if (!parts.includes(userId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (message.sender_id === userId) {
      return res.status(400).json({ error: 'Cannot mark own message as read' });
    }

    await message.update({ is_read: true, read_at: new Date() });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${chatId}`).emit('message_read', { messageId: id, userId });
    }

    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};