const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/me',           authenticate, userController.getMe);
router.get('/',             authenticate, authorize('admin'), userController.getAll);
router.put('/:id',          authenticate, authorize('admin'), userController.update);
router.put('/:id/password', authenticate, userController.updatePassword);

module.exports = router;
