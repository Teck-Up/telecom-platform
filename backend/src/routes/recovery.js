const express = require('express');
const router = express.Router();
const recoveryController = require('../controllers/recoveryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'recovery_agent'), recoveryController.getAll);
router.get('/:id', authenticate, authorize('admin', 'recovery_agent'), recoveryController.getOne);
router.post('/', authenticate, authorize('admin', 'recovery_agent'), recoveryController.create);
router.put('/:id', authenticate, authorize('admin', 'recovery_agent'), recoveryController.update);
router.post('/:id/interactions', authenticate, authorize('admin', 'recovery_agent'), recoveryController.logInteraction);
router.post('/:id/dunning', authenticate, authorize('admin', 'recovery_agent'), recoveryController.sendDunning);
router.get('/:id/reminders', authenticate, authorize('admin', 'recovery_agent'), recoveryController.getReminders);
router.post('/:id/reminders', authenticate, authorize('admin', 'recovery_agent'), recoveryController.sendReminder);

module.exports = router;
