const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const validate = require('../middleware/validation');
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, try again later' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registrations from this IP' },
});

router.post('/register', registerLimiter, validate('register'), authController.register);
router.post('/login', loginLimiter, validate('login'), authController.login);
router.post('/refresh', validate('refresh'), authController.refresh);
router.post('/logout', validate('logout'), authController.logout);

module.exports = router;