const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const validateDto = require('../middleware/validate');

// Import du DTO
const CreatePaymentDTO = require('../DTO/Payment/CreatePaymentDTO');

// GET all payments
router.get('/', authenticate, paymentController.getAll);

// POST create payment (Ajout de la validation)
router.post('/',
    authenticate,
    authorize('admin', 'billing_agent', 'recovery_agent'),
    validateDto(CreatePaymentDTO),
    paymentController.create
);

module.exports = router;
