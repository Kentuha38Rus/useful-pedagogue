const { Notification, User, PushSubscription } = require('../models');
const notificationService = require('../services/notificationService');

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    const notifications = await Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({
      notifications: notifications.rows,
      total: notifications.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOne({ where: { id, user_id: userId } });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    await notification.update({ is_read: true, read_at: new Date() });
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

exports.sendPush = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { role, title, body, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const where = {};
    if (role) {
      where.role = role;
    }
    const users = await User.findAll({ where, attributes: ['id'] });
    const userIds = users.map(u => u.id);

    const subscriptions = await PushSubscription.findAll({
      where: { user_id: userIds },
    });

    const payload = { title, body, data: data || {} };
    const results = await notificationService.sendPushNotifications(subscriptions, payload);

    // Сохраняем уведомления в БД для каждого пользователя
    const notificationsToCreate = userIds.map(userId => ({
      user_id: userId,
      title,
      body,
      type: 'admin',
      is_read: false,
    }));
    await Notification.bulkCreate(notificationsToCreate);

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
};

exports.saveSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    const saved = await notificationService.saveSubscription(userId, subscription);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
};