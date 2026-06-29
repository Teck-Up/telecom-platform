const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');

const staff = ['admin', 'billing_agent', 'recovery_agent'];

router.get('/', authenticate, authorize(...staff), clientController.getAll);
router.get('/:id/financials', authenticate, authorize(...staff), clientController.getFinancials);
router.get('/:id/invoices', authenticate, authorize(...staff), clientController.getInvoices);
router.get('/:id/payments', authenticate, authorize(...staff), clientController.getPayments);
router.get('/:id/recovery-cases', authenticate, authorize(...staff), clientController.getRecoveryCases);
router.patch('/:id/status', authenticate, authorize('admin', 'billing_agent'), clientController.updateStatus);
router.get('/:id', authenticate, authorize(...staff), clientController.getOne);
router.post('/', authenticate, authorize('admin', 'billing_agent'), clientController.create);
router.put('/:id', authenticate, authorize('admin', 'billing_agent'), clientController.update);
router.delete('/:id', authenticate, authorize('admin'), clientController.remove);

module.exports = router;
