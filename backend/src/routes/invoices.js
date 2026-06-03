const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',                    authenticate, invoiceController.getAll);
router.get('/:id',                 authenticate, invoiceController.getOne);
router.post('/',                   authenticate, authorize('admin', 'billing_agent'), invoiceController.create);
router.put('/:id/status',          authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), invoiceController.updateStatus);
router.get('/:id/pdf',             authenticate, invoiceController.generatePDF);
router.post('/check-overdue',      authenticate, authorize('admin'), invoiceController.checkOverdue);

module.exports = router;
