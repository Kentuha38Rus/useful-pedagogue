const { Op } = require('sequelize');

class ChatService {
  // chat_id = "min_max" — сортировка лексикографическая (UUID → строки)
  static getChatId(userId1, userId2) {
    const ids = [String(userId1), String(userId2)].sort();
    return `${ids[0]}_${ids[1]}`;
  }

  static async getDialogs(userId, MessageModel, UserModel) {
    const uid = String(userId);

    // Ищем все chat_id, где userId — одна из сторон.
    // chat_id = "<uuid1>_<uuid2>", UUID содержит дефисы, а не подчёркивания,
    // поэтому split('_') даёт ровно 2 части.
    const chatIds = await MessageModel.findAll({
      attributes: ['chat_id'],
      where: {
        [Op.or]: [
          { chat_id: { [Op.like]: `${uid}_%` } },
          { chat_id: { [Op.like]: `%_${uid}` } },
        ],
      },
      group: ['chat_id'],
      raw: true,
    });

    const dialogs = [];
    for (const item of chatIds) {
      const chatId = item.chat_id;
      const parts = String(chatId).split('_');
      if (parts.length !== 2) continue;

      const otherId = parts[0] === uid ? parts[1] : parts[0];

      const lastMessage = await MessageModel.findOne({
        where: { chat_id: chatId },
        order: [['created_at', 'DESC']],
        include: [
          {
            model: UserModel,
            as: 'sender',
            attributes: ['id', 'name', 'role'],
          },
        ],
      });

      const otherUser = await UserModel.findByPk(otherId, {
        attributes: ['id', 'name', 'role'],
      });

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

    // Свежие — сверху
    dialogs.sort((a, b) => {
      const at = a.last_message?.created_at
        ? new Date(a.last_message.created_at).getTime()
        : 0;
      const bt = b.last_message?.created_at
        ? new Date(b.last_message.created_at).getTime()
        : 0;
      return bt - at;
    });

    return dialogs;
  }

  /**
   * История сообщений.
   * 👇 Грузим ПОСЛЕДНИЕ `limit` сообщений (DESC), затем реверсируем,
   *    чтобы фронт получил ASC (старые сверху). Так в батч попадают
   *    свежие непрочитанные, и mark_read уходит на сервер корректно.
   */
  static async getChatHistory(
    chatId,
    MessageModel,
    UserModel,
    limit = 50,
    offset = 0
  ) {
    const result = await MessageModel.findAndCountAll({
      where: { chat_id: chatId },
      order: [['created_at', 'DESC']],
      include: [
        { model: UserModel, as: 'sender', attributes: ['id', 'name', 'role'] },
      ],
      limit,
      offset,
    });

    // Reversed — ASC для UI
    const rows = result.rows.slice().reverse();

    return { count: result.count, rows };
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