// src/controllers/payment.controller.js
const PaymentService = require('../services/payment.service');

const paymentController = {
  getAll: async (req, res, next) => {
    try {
      const result = await PaymentService.getAllPayments(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err); // <-- Le middleware errorHandler prend le relais !
    }
  },

  create: async (req, res, next) => {
    try {
      // Plus besoin de vérifier req.body ici, le validateDto s'en est déjà chargé !
      const newStatus = await PaymentService.createPayment(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Paiement enregistré',
        new_status: newStatus
      });
    } catch (err) {
      next(err); // <-- Gère automatiquement les erreurs 404 ou 500
    }
  },
};

module.exports = paymentController;
