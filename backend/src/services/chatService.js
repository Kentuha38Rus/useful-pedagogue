const { Op } = require('sequelize');

class ChatService {
  // chat_id = "min_max"
  static getChatId(userId1, userId2) {
    const ids = [String(userId1), String(userId2)].sort();
    return `${ids[0]}_${ids[1]}`;
  }

  static async getDialogs(
    userId,
    tenantId,
    MessageModel,
    UserModel,
    role = null
  ) {
    const uid = String(userId);

    const chatIds = await MessageModel.findAll({
      attributes: ['chat_id'],
      where: {
        tenant_id: tenantId,
        [Op.or]: [
          { chat_id: { [Op.like]: `${uid}_%` } },
          { chat_id: { [Op.like]: `%_${uid}` } },
        ],
      },
      group: ['chat_id'],
      raw: true,
    });

    const chatIdList = chatIds.map((item) => item.chat_id);

    // Админам дополнительно показываем общий чат автоуведомлений
    // и чаты рассылок (у каждого получателя — свой).
    if (role === 'admin') {
      const autoChatId = `auto_${tenantId}`;
      const autoMessage = await MessageModel.findOne({
        where: { chat_id: autoChatId, tenant_id: tenantId },
        attributes: ['id'],
      });
      if (autoMessage) chatIdList.push(autoChatId);

      const broadcastRows = await MessageModel.findAll({
        attributes: ['chat_id'],
        where: {
          tenant_id: tenantId,
          chat_id: { [Op.like]: 'broadcast_%' },
        },
        group: ['chat_id'],
        raw: true,
      });
      broadcastRows.forEach((row) => chatIdList.push(row.chat_id));
    }

    const seen = new Set();
    const dialogs = [];

    for (const chatId of chatIdList) {
      if (!chatId || seen.has(chatId)) continue;
      seen.add(chatId);

      const parts = String(chatId).split('_');
      if (parts.length !== 2) continue;

      let otherUser = null;
      let unreadSenderId = null;

      if (chatId === `auto_${tenantId}`) {
        otherUser = {
          id: 'auto',
          name: 'Автоуведомления',
          role: 'system',
        };
      } else if (String(chatId).startsWith('broadcast_')) {
        const recipientId = String(chatId).slice('broadcast_'.length);
        const recipient = await UserModel.findByPk(recipientId, {
          attributes: ['id', 'name', 'role'],
        });

        otherUser =
          role === 'admin'
            ? {
                id: recipientId,
                name: `Рассылки: ${recipient?.name || 'получатель'}`,
                role: 'broadcast',
              }
            : {
                id: 'broadcast',
                name: 'Рассылки',
                role: 'system',
              };
      } else {
        const otherId = parts[0] === uid ? parts[1] : parts[0];
        unreadSenderId = otherId;
        otherUser = await UserModel.findByPk(otherId, {
          attributes: ['id', 'name', 'role'],
        });
      }

      const lastMessage = await MessageModel.findOne({
        where: { chat_id: chatId, tenant_id: tenantId },
        order: [['created_at', 'DESC']],
        include: [
          { model: UserModel, as: 'sender', attributes: ['id', 'name', 'role'] },
        ],
      });

      const unreadWhere = {
        chat_id: chatId,
        tenant_id: tenantId,
        is_read: false,
      };
      if (
        chatId === `auto_${tenantId}` ||
        String(chatId).startsWith('broadcast_')
      ) {
        unreadWhere.sender_id = { [Op.ne]: uid };
      } else if (unreadSenderId) {
        unreadWhere.sender_id = unreadSenderId;
      }

      const unreadCount = await MessageModel.count({ where: unreadWhere });

      dialogs.push({
        chat_id: chatId,
        other_user: otherUser,
        last_message: lastMessage,
        unread_count: unreadCount,
      });
    }

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

  static async getChatHistory(chatId, tenantId, MessageModel, UserModel, limit = 50, offset = 0) {
    const result = await MessageModel.findAndCountAll({
      where: { chat_id: chatId, tenant_id: tenantId },
      order: [['created_at', 'DESC']],
      include: [
        { model: UserModel, as: 'sender', attributes: ['id', 'name', 'role'] },
      ],
      limit,
      offset,
    });

    const rows = result.rows.slice().reverse();
    return { count: result.count, rows };
  }

  static async sendMessage(chatId, senderId, content, tenantId, MessageModel) {
    return await MessageModel.create({
      tenant_id: tenantId,
      chat_id: chatId,
      sender_id: senderId,
      content,
    });
  }
}

module.exports = ChatService;