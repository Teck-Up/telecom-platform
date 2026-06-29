const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validateDto = require('../middleware/validate');

// Imports des DTOs
const UpdateUserDTO = require('../DTO/User/UpdateUserDTO');
const UpdatePasswordDTO = require('../DTO/User/UpdatePasswordDTO');

// GET profil de l'utilisateur connecté
router.get('/me', authenticate, userController.getMe);

// GET tous les utilisateurs (Admin uniquement)
router.get('/', authenticate, authorize('admin'), userController.getAll);

// PUT mise à jour d'un utilisateur (Ajout de la validation)
router.put('/:id',
    authenticate,
    authorize('admin'),
    validateDto(UpdateUserDTO),
    userController.update
);

// PUT mise à jour du mot de passe (Ajout de la validation)
router.put('/:id/password',
    authenticate,
    validateDto(UpdatePasswordDTO),
    userController.updatePassword
);

module.exports = router;
