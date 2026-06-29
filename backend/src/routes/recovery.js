const express = require('express');
const router = express.Router();
const recoveryController = require('../controllers/recoveryController');
const { authenticate, authorize } = require('../middleware/auth');
const validateDto = require('../middleware/validate');

// Imports des DTOs
const CreateRecoveryCaseDTO = require('../DTO/RecoveryCase/CreateRecoveryCaseDTO');
const UpdateRecoveryCaseDTO = require('../DTO/RecoveryCase/UpdateRecoveryCaseDTO');
const CreateReminderDTO = require('../DTO/Reminder/CreateReminderDTO');

// GET all recovery cases
router.get('/', authenticate, authorize('admin', 'recovery_agent'), recoveryController.getAll);

// POST create recovery case (Ajout de la validation)
router.post('/',
    authenticate,
    authorize('admin', 'recovery_agent'),
    validateDto(CreateRecoveryCaseDTO),
    recoveryController.create
);

// PUT update recovery case (Ajout de la validation)
router.put('/:id',
    authenticate,
    authorize('admin', 'recovery_agent'),
    validateDto(UpdateRecoveryCaseDTO),
    recoveryController.update
);

// GET reminders for a specific case
router.get('/:id/reminders', authenticate, authorize('admin', 'recovery_agent'), recoveryController.getReminders);

// POST send a reminder (Ajout de la validation)
router.post('/:id/reminders',
    authenticate,
    authorize('admin', 'recovery_agent'),
    validateDto(CreateReminderDTO),
    recoveryController.sendReminder
);

module.exports = router;
