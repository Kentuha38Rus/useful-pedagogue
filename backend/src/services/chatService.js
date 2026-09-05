const { Op } = require('sequelize');

class ChatService {
  static getChatId(userId1, userId2) {
    const ids = [userId1, userId2].sort((a, b) => a - b);
    return `${ids[0]}_${ids[1]}`;
  }

  static async getDialogs(userId, MessageModel, UserModel) {
    // Находим все уникальные chat_id, где участвует пользователь
    const chatIds = await MessageModel.findAll({
      attributes: ['chat_id'],
      where: {
        [Op.or]: [
          { sender_id: userId },
          { '$sender.id$': userId } // если нужны дополнительные условия
        ]
      },
      group: ['chat_id'],
      raw: true,
    });

    const dialogs = [];
    for (const item of chatIds) {
      const chatId = item.chat_id;
      const parts = chatId.split('_');
      const otherId = parseInt(parts[0]) === userId ? parseInt(parts[1]) : parseInt(parts[0]);

      const lastMessage = await MessageModel.findOne({
        where: { chat_id: chatId },
        order: [['created_at', 'DESC']],
        include: [{ model: UserModel, as: 'sender', attributes: ['id', 'name', 'role'] }],
      });

      const otherUser = await UserModel.findByPk(otherId, { attributes: ['id', 'name', 'role'] });

      const unreadCount = await MessageModel.count({
        where: {
          chat_id: chatId,
          is_read: false,
          sender_id: otherId,
        },
      });

      dialogs.push({
        chat_id: chatId,
        other_user: otherUser,
        last_message: lastMessage,
        unread_count: unreadCount,
      });
    }
    return dialogs;
  }

  static async getChatHistory(chatId, MessageModel, UserModel, limit = 50, offset = 0) {
    return await MessageModel.findAndCountAll({
      where: { chat_id: chatId },
      order: [['created_at', 'DESC']],
      include: [{ model: UserModel, as: 'sender', attributes: ['id', 'name', 'role'] }],
      limit,
      offset,
    });
  }

  static async sendMessage(chatId, senderId, content, MessageModel) {
    return await MessageModel.create({
      chat_id: chatId,
      sender_id: senderId,
      content,
    });
  }
}

module.exports = ChatService;