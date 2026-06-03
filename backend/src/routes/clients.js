const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',    authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), clientController.getAll);
router.get('/:id', authenticate, clientController.getOne);
router.post('/',   authenticate, authorize('admin', 'billing_agent'), clientController.create);
router.put('/:id', authenticate, authorize('admin', 'billing_agent'), clientController.update);
router.delete('/:id', authenticate, authorize('admin'), clientController.remove);

module.exports = router;
