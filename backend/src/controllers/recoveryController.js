const RecoveryService = require('../services/recovery.service');

const recoveryController = {
  getAll: async (req, res, next) => {
    try {
      const result = await RecoveryService.getAllCases(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  create: async (req, res, next) => {
    try {
      const caseId = await RecoveryService.createCase(req.body, req.user.id);
      res.status(201).json({ success: true, id: caseId, message: 'Dossier créé' });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      await RecoveryService.updateCase(req.params.id, req.body);
      res.json({ success: true, message: 'Dossier mis à jour' });
    } catch (err) {
      next(err);
    }
  },

  getReminders: async (req, res, next) => {
    try {
      const data = await RecoveryService.getReminders(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  sendReminder: async (req, res, next) => {
    try {
      await RecoveryService.sendReminder(req.params.id, req.body, req.user.id);
      res.status(201).json({ success: true, message: 'Relance envoyée' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = recoveryController;
