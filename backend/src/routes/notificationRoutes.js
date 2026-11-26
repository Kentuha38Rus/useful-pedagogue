const router = require('express').Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Все остальные требуют auth
router.use(auth);

router.get('/', notificationController.getNotifications);
router.patch('/:id', notificationController.markNotificationAsRead);
router.post('/push', roleCheck(['admin']), notificationController.sendPush);
router.post('/subscribe', notificationController.saveSubscription);
router.delete('/subscribe', notificationController.deleteSubscription);

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

// Уведомить одного участника занятия (ребёнка/родителя или преподавателя)
router.post(
  '/lesson-reminders/lesson/:lessonId/target',
  roleCheck(['admin']),
  notificationController.sendLessonReminderForPerson
);

router.get(
  '/lesson-responses',
  roleCheck(['admin']),
  notificationController.getLessonResponses
);

module.exports = router;