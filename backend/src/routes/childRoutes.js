const express = require('express');
const childController = require('../controllers/childController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const router = express.Router();

router.use(auth);

router.get('/', childController.getChildren);
// Добавлять детей может только администратор (родитель — нет)
router.post('/', roleCheck('admin'), validate('createChild'), childController.createChild);
router.get('/:id', childController.getChildById);
router.patch('/:id', validate('updateChild'), childController.updateChild);
router.delete('/:id', childController.deleteChild);

module.exports = router;
