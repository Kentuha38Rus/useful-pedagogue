const router = require('express').Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Публичный endpoint для Service Worker (без auth, но с подписанным токеном)
router.post(
  '/lesson-responses/respond-by-token',
  notificationController.respondToLessonReminderByToken
);

// Все остальные требуют auth
router.use(auth);

router.get('/', notificationController.getNotifications);
router.patch('/:id', notificationController.markNotificationAsRead);
router.post('/push', roleCheck(['admin']), notificationController.sendPush);
router.post('/subscribe', notificationController.saveSubscription);

// Напоминания
router.post(
  '/lesson-reminders/today',
  roleCheck(['admin']),
  notificationController.sendLessonRemindersForToday
);
// 👇 Уведомить по одному занятию
router.post(
  '/lesson-reminders/lesson/:lessonId',
  roleCheck(['admin']),
  notificationController.sendLessonRemindersForLesson
);

router.get(
  '/lesson-responses',
  roleCheck(['admin']),
  notificationController.getLessonResponses
);
router.post(
  '/lesson-responses/:id/respond',
  notificationController.respondToLessonReminder
);

module.exports = router;