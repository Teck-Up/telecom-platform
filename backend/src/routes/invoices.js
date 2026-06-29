const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');
const validateDto = require('../middleware/validate');

// Imports des DTOs
const CreateInvoiceDTO = require('../DTO/Invoice/CreateInvoiceDTO');
const UpdateInvoiceDTO = require('../DTO/Invoice/UpdateInvoiceDTO');

// GET all invoices
router.get('/', authenticate, invoiceController.getAll);

// GET single invoice
router.get('/:id', authenticate, invoiceController.getOne);

// POST create invoice (Ajout de la validation)
router.post('/',
    authenticate,
    authorize('admin', 'billing_agent'),
    validateDto(CreateInvoiceDTO),
    invoiceController.create
);

// PUT update invoice status (Ajout de la validation)
router.put('/:id/status',
    authenticate,
    authorize('admin', 'billing_agent', 'recovery_agent'),
    validateDto(UpdateInvoiceDTO),
    invoiceController.updateStatus
);

// GET generate PDF
router.get('/:id/pdf', authenticate, invoiceController.generatePDF);

// POST check overdue invoices (Pas de body, donc pas de DTO nécessaire)
router.post('/check-overdue', authenticate, authorize('admin'), invoiceController.checkOverdue);

module.exports = router;
