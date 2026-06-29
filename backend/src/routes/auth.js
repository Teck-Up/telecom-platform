const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // ou auth.controller.js selon ton nommage
const validateDto = require('../middleware/validate');

// Imports des DTOs en respectant ta belle structure de dossiers
const LoginDTO = require('../DTO/auth/LoginDTO');
const CreateUserDTO = require('../DTO/User/CreateUserDTO');

// Route pour la connexion (avec validation)
router.post('/login', validateDto(LoginDTO), authController.login);

// Route pour l'inscription (avec validation)
router.post('/register', validateDto(CreateUserDTO), authController.register);

module.exports = router;
