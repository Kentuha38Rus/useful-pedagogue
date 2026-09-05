const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validation');
const router = express.Router();

router.post('/register', validate('register'), authController.register);
router.post('/login', validate('login'), authController.login);
router.post('/refresh', validate('refresh'), authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;