const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), paymentController.getAll);
router.get('/:id', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), paymentController.getOne);
router.post('/', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), paymentController.create);

module.exports = router;
