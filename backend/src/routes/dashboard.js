const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), dashboardController.getStats);
router.get('/ca',    authenticate, authorize('admin'), dashboardController.getCA);

module.exports = router;
