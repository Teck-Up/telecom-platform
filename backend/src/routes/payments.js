const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',  authenticate, paymentController.getAll);
router.post('/', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), paymentController.create);

module.exports = router;
