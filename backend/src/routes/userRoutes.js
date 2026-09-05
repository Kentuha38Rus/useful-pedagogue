const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const validate = require('../middleware/validation');
const router = express.Router();

router.get('/me', auth, userController.getMe);
router.patch('/me', auth, validate('updateUser'), userController.updateMe);
router.get('/teachers', auth, roleCheck('admin'), userController.getTeachers);

module.exports = router;