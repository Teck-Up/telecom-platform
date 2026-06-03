const express = require('express');
const router = express.Router();
const recoveryController = require('../controllers/recoveryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',                    authenticate, authorize('admin', 'recovery_agent'), recoveryController.getAll);
router.post('/',                   authenticate, authorize('admin', 'recovery_agent'), recoveryController.create);
router.put('/:id',                 authenticate, authorize('admin', 'recovery_agent'), recoveryController.update);
router.get('/:id/reminders',       authenticate, authorize('admin', 'recovery_agent'), recoveryController.getReminders);
router.post('/:id/reminders',      authenticate, authorize('admin', 'recovery_agent'), recoveryController.sendReminder);

module.exports = router;
