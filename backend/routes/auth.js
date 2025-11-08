const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');

router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], authController.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], authController.login);

// forgot password (generate temp password and email it)
router.post('/forgot', [ body('email').isEmail() ], authController.forgotPassword);

// seller verification (used when seller initiates login from client login page)
router.post('/seller/verify', authController.verifySellerCode);

router.get('/me', authController.protect, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
