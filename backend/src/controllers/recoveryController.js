const { RecoveryCase, Reminder, Invoice, Client, User, Notification } = require('../models');

const recoveryController = {
  getAll: async (req, res) => {
    try {
      const { status, priority, page = 1, limit = 20 } = req.query;
      const where = {};
      if (status)   where.status   = status;
      if (priority) where.priority = priority;

      const rows = await RecoveryCase.findAll({
        where,
        include: [
          { model: Invoice, as: 'invoice', attributes: ['invoice_number', 'amount_ttc', 'due_date'] },
          { model: Client,  as: 'client',  include: [{ model: User, as: 'user', attributes: ['name'] }] },
          { model: User,    as: 'agent',   attributes: ['name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('getAll recovery error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      const { client_id, invoice_id, priority, notes } = req.body;

      const invoice = await Invoice.findByPk(invoice_id);
      if (!invoice)
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });

      const overdue_days = Math.max(0, Math.floor((new Date() - new Date(invoice.due_date)) / 86400000));
      const overdue_amount = invoice.amount_ttc - invoice.amount_paid;

      const recoveryCase = await RecoveryCase.create({
        client_id, invoice_id, recovery_agent_id: req.user.id,
        overdue_amount, overdue_days, priority: priority || 'medium', notes,
      });

      res.status(201).json({ success: true, id: recoveryCase.id, message: 'Dossier créé' });
    } catch (err) {
      console.error('create recovery error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  update: async (req, res) => {
    try {
      const { status, priority, notes } = req.body;
      const resolved_at = status === 'resolved' ? new Date() : null;
      await RecoveryCase.update(
        { status, priority, notes, resolved_at },
        { where: { id: req.params.id } }
      );
      res.json({ success: true, message: 'Dossier mis à jour' });
    } catch (err) {
      console.error('update recovery error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getReminders: async (req, res) => {
    try {
      const rows = await Reminder.findAll({
        where: { recovery_case_id: req.params.id },
        include: [{ model: User, as: 'createdByUser', attributes: ['name'], foreignKey: 'created_by' }],
        order: [['created_at', 'DESC']],
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  sendReminder: async (req, res) => {
    try {
      const { type, response } = req.body;
      const recoveryCase = await RecoveryCase.findByPk(req.params.id);
      if (!recoveryCase)
        return res.status(404).json({ success: false, message: 'Dossier non trouvé' });

      await Reminder.create({
        recovery_case_id: recoveryCase.id,
        invoice_id: recoveryCase.invoice_id,
        client_id: recoveryCase.client_id,
        type, status: 'sent', sent_at: new Date(),
        response, created_by: req.user.id,
      });

      // Notify client
      const client = await Client.findByPk(recoveryCase.client_id);
      if (client?.user_id) {
        await Notification.create({
          user_id: client.user_id,
          title: 'Relance de paiement',
          message: 'Une relance a été envoyée concernant votre facture en retard de paiement.',
          type: 'warning',
        });
      }

      res.status(201).json({ success: true, message: 'Relance envoyée' });
    } catch (err) {
      console.error('sendReminder error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = recoveryController;
