const express = require('express');
const router = express.Router();
const { protect } = require('../controllers/authController');
const { authorize } = require('../middleware/role');
const sellerController = require('../controllers/sellerController');

// seller analytics and insights (seller or admin)
router.get('/analytics', protect, authorize('seller','admin'), sellerController.analytics);
// list registered clients (seller or admin)
router.get('/clients', protect, authorize('seller','admin'), sellerController.clients);

module.exports = router;
