const cron = require('node-cron');
const { Lesson, Group, User, PushSubscription } = require('../models');
const notificationService = require('../services/notificationService');
const { Op } = require('sequelize');

// Запуск каждый час в 0 минут
cron.schedule('0 * * * *', async () => {
  console.log('Running reminder cron job...');
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Пример: ищем занятия, начинающиеся в ближайший час
    const lessons = await Lesson.findAll({
      where: {
        start_time: {
          [Op.between]: [now, oneHourLater],
        },
      },
      include: [
        {
          model: Group,
          include: [{ model: User, as: 'parents' }] // предположим, есть связь
        }
      ]
    });

    // Для каждого урока собираем родителей детей, записанных на этот урок
    // Здесь нужна реальная логика, зависящая от структуры связей.
    // Для демонстрации отправляем всем родителям напоминание.
    const parents = await User.findAll({ where: { role: 'parent' } });
    const subscriptions = await PushSubscription.findAll({
      where: { user_id: parents.map(p => p.id) },
    });

    const payload = {
      title: 'Напоминание о занятии',
      body: `У вас скоро занятие!`,
      data: { type: 'reminder' },
    };

    await notificationService.sendPushNotifications(subscriptions, payload);
  } catch (error) {
    console.error('Reminder job failed:', error);
  }
});