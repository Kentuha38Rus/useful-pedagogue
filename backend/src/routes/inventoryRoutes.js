const router = require('express').Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/auth');

// Личный кабинет: педагоги видят имущество своих филиалов и создают заявки.
router.use(auth);

router.get('/', inventoryController.getMyInventory);
router.get('/issues', inventoryController.getIssues);
router.post('/issues', inventoryController.createIssue);

module.exports = router;
