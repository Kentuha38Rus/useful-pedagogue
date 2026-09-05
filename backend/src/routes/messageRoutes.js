const router = require('express').Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/chats', messageController.getDialogs);
router.get('/chat/:chatId', messageController.getChatHistory);
router.post('/', messageController.sendMessage);
router.patch('/:id/read', messageController.markAsRead);

module.exports = router;