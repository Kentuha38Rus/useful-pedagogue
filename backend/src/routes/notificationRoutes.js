const router = require('express').Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);

router.get('/', notificationController.getNotifications);
router.patch('/:id', notificationController.markNotificationAsRead);
router.post('/push', roleCheck(['admin']), notificationController.sendPush);
router.post('/subscribe', notificationController.saveSubscription);

module.exports = router;