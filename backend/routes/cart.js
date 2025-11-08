const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../controllers/authController');

router.get('/', protect, cartController.getCart);
router.post('/', protect, cartController.saveCart);

module.exports = router;
