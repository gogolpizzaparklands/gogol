const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../controllers/authController');

router.post('/order/:id/stkpush', protect, paymentController.initiatePayment);

module.exports = router;
