const express = require('express');
const router = express.Router();
const AiController = require('../controllers/AiController');

// Route pour le Chatbot
router.post('/chat', AiController.chat);
router.post('/chat/clear', AiController.clearChatMemory);

// Routes pour les Prédictions
router.post('/predict', AiController.predict);
router.post('/predict/retrain', AiController.retrainPredictionModel);

// Routes pour le Dashboard Analytique
router.get('/dashboard/summary', AiController.getDashboardSummary);
router.get('/dashboard/revenue-history', AiController.getRevenueHistory);
router.get('/dashboard/invoice-distribution', AiController.get_invoice_distribution);
module.exports = router;
