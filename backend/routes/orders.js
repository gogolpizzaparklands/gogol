const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../controllers/authController');

router.post('/', protect, orderController.createOrder);
router.get('/:id', protect, orderController.getOrder);
router.get('/', protect, orderController.listOrders);
router.put('/:id/status', protect, orderController.updateStatus);

// delete an order (seller may delete orders related to their products, admin can delete any)
router.delete('/:id', protect, orderController.deleteOrder);

// Mpesa callbacks
router.post('/mpesa/callback', orderController.mpesaCallback);

module.exports = router;
