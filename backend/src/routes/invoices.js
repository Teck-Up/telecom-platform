const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, invoiceController.getAll);
router.post('/check-overdue', authenticate, authorize('admin'), invoiceController.checkOverdue);
router.get('/:id/history', authenticate, invoiceController.getHistory);
router.get('/:id/payments', authenticate, invoiceController.getPayments);
router.get('/:id/pdf', authenticate, invoiceController.generatePDF);
router.post('/:id/reminder', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), invoiceController.sendReminder);
router.post('/:id/escalate', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), invoiceController.escalateToRecovery);
router.get('/:id', authenticate, invoiceController.getOne);
router.post('/', authenticate, authorize('admin', 'billing_agent'), invoiceController.create);
router.put('/:id/status', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), invoiceController.updateStatus);

module.exports = router;
