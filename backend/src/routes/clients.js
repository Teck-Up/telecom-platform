const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticate, authorize } = require('../middleware/auth');
const validateDto = require('../middleware/validate');

// Imports des DTOs (en respectant ta structure de dossiers)
const CreateClientDTO = require('../DTO/Client/CreateClientDTO');
const UpdateClientDTO = require('../DTO/Client/UpdateClientDTO');

// GET all clients
router.get('/', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), clientController.getAll);

// GET single client
router.get('/:id', authenticate, clientController.getOne);

// POST create client (Ajout de la validation CreateClientDTO)
router.post('/',
    authenticate,
    authorize('admin', 'billing_agent'),
    validateDto(CreateClientDTO),
    clientController.create
);

// PUT update client (Ajout de la validation UpdateClientDTO)
router.put('/:id',
    authenticate,
    authorize('admin', 'billing_agent'),
    validateDto(UpdateClientDTO),
    clientController.update
);

// DELETE client
router.delete('/:id', authenticate, authorize('admin'), clientController.remove);

module.exports = router;
