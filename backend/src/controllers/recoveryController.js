const {
  RecoveryCase, RecoveryInteraction, Reminder, Invoice, Client, User, Notification,
} = require('../models');
const { Op } = require('sequelize');

const DUNNING_TEMPLATES = {
  rappel_1: {
    type: 'email',
    label: 'Rappel 1',
    content: 'Bonjour, nous vous rappelons que votre facture est en retard de paiement. Merci de régulariser votre situation dans les meilleurs délais.',
  },
  rappel_2: {
    type: 'email',
    label: 'Rappel 2',
    content: 'Second rappel : votre facture demeure impayée. Sans régularisation sous 8 jours, des pénalités pourront être appliquées.',
  },
  mise_en_demeure: {
    type: 'legal_notice',
    label: 'Mise en demeure',
    content: 'MISE EN DEMEURE : Conformément à la réglementation, nous vous enjoignons de régler la somme due sous 15 jours, faute de quoi une procédure contentieuse sera engagée.',
  },
};

const formatRecoveryListRow = (row) => {
  const j = row.toJSON();
  return {
    id: j.id,
    client_id: j.client_id,
    invoice_id: j.invoice_id,
    client_name: j.client?.user?.name || null,
    company_name: j.client?.company_name || null,
    invoice_number: j.invoice?.invoice_number || null,
    overdue_amount: Number(j.overdue_amount),
    penalty_amount: Number(j.penalty_amount || 0),
    overdue_days: j.overdue_days,
    priority: j.priority,
    status: j.status,
    agent_name: j.agent?.name || null,
    created_at: j.created_at,
  };
};

const computeRiskTier = (overdueDays, priority) => {
  if (priority === 'critical' || overdueDays > 90) return 'critical';
  if (priority === 'high' || overdueDays > 60) return 'high';
  if (overdueDays > 30) return 'medium';
  return 'low';
};

const recoveryController = {
  getAll: async (req, res) => {
    try {
      const { status, priority, page = 1, limit = 20 } = req.query;
      const where = {};
      if (status) where.status = status;
      if (priority) where.priority = priority;

      const { count, rows } = await RecoveryCase.findAndCountAll({
        where,
        include: [
          { model: Invoice, as: 'invoice', attributes: ['invoice_number', 'amount_ttc', 'due_date'] },
          { model: Client, as: 'client', include: [{ model: User, as: 'user', attributes: ['name'] }] },
          { model: User, as: 'agent', attributes: ['name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      res.json({ success: true, data: rows.map(formatRecoveryListRow), total: count });
    } catch (err) {
      console.error('getAll recovery error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const recoveryCase = await RecoveryCase.findByPk(req.params.id, {
        include: [
          {
            model: Invoice,
            as: 'invoice',
            attributes: ['id', 'invoice_number', 'amount_ttc', 'amount_paid', 'due_date', 'issue_date', 'status'],
          },
          {
            model: Client,
            as: 'client',
            include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
          },
          { model: User, as: 'agent', attributes: ['id', 'name', 'email'] },
          {
            model: Reminder,
            as: 'reminders',
            include: [{ model: User, as: 'author', attributes: ['name'] }],
          },
          {
            model: RecoveryInteraction,
            as: 'interactions',
            include: [{ model: User, as: 'author', attributes: ['name'] }],
          },
        ],
      });

      if (!recoveryCase) {
        return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
      }

      const j = recoveryCase.toJSON();
      const timeline = [
        ...(j.reminders || []).map((r) => ({
          id: `reminder-${r.id}`,
          kind: 'reminder',
          type: r.type,
          label: `Relance ${r.type}`,
          content: r.response || 'Relance automatique envoyée',
          occurred_at: r.sent_at || r.created_at,
          author: r.author?.name || 'Système',
        })),
        ...(j.interactions || []).map((i) => ({
          id: `interaction-${i.id}`,
          kind: 'interaction',
          type: i.interaction_type,
          label: i.interaction_type === 'phone' ? 'Appel téléphonique' : i.interaction_type === 'email' ? 'Email' : 'Note',
          content: i.content,
          occurred_at: i.created_at,
          author: i.author?.name || 'Système',
        })),
      ].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));

      res.json({
        success: true,
        data: {
          id: j.id,
          client_id: j.client_id,
          invoice_id: j.invoice_id,
          status: j.status,
          priority: j.priority,
          overdue_amount: Number(j.overdue_amount),
          penalty_amount: Number(j.penalty_amount || 0),
          overdue_days: j.overdue_days,
          notes: j.notes,
          resolved_at: j.resolved_at,
          created_at: j.created_at,
          updated_at: j.updated_at,
          risk_tier: computeRiskTier(j.overdue_days, j.priority),
          total_exposure: Number(j.overdue_amount) + Number(j.penalty_amount || 0),
          client: {
            name: j.client?.user?.name || null,
            email: j.client?.user?.email || null,
            company_name: j.client?.company_name || null,
          },
          invoice: j.invoice
            ? {
                id: j.invoice.id,
                invoice_number: j.invoice.invoice_number,
                amount_ttc: Number(j.invoice.amount_ttc),
                amount_paid: Number(j.invoice.amount_paid),
                due_date: j.invoice.due_date,
                status: j.invoice.status,
              }
            : null,
          agent: j.agent ? { id: j.agent.id, name: j.agent.name, email: j.agent.email } : null,
          timeline,
        },
      });
    } catch (err) {
      console.error('getOne recovery error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      const { client_id, invoice_id, priority, notes } = req.body;

      const invoice = await Invoice.findByPk(invoice_id);
      if (!invoice)
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });

      const overdue_days = Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date)) / 86400000));
      const overdue_amount = Number(invoice.amount_ttc) - Number(invoice.amount_paid);

      const recoveryCase = await RecoveryCase.create({
        client_id,
        invoice_id,
        recovery_agent_id: req.user.id,
        overdue_amount,
        overdue_days,
        priority: priority || 'medium',
        notes,
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

  logInteraction: async (req, res) => {
    try {
      const { interaction_type, content } = req.body;
      const recoveryCase = await RecoveryCase.findByPk(req.params.id);
      if (!recoveryCase)
        return res.status(404).json({ success: false, message: 'Dossier non trouvé' });

      const interaction = await RecoveryInteraction.create({
        recovery_case_id: recoveryCase.id,
        interaction_type: interaction_type || 'note',
        content,
        created_by: req.user.id,
      });

      if (recoveryCase.status === 'open') {
        await recoveryCase.update({ status: 'in_progress' });
      }

      res.status(201).json({ success: true, id: interaction.id, message: 'Interaction enregistrée' });
    } catch (err) {
      console.error('logInteraction error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  sendDunning: async (req, res) => {
    try {
      const { template } = req.body;
      const tpl = DUNNING_TEMPLATES[template];
      if (!tpl)
        return res.status(400).json({ success: false, message: 'Modèle de relance invalide' });

      const recoveryCase = await RecoveryCase.findByPk(req.params.id, {
        include: [{ model: Client, as: 'client' }, { model: Invoice, as: 'invoice' }],
      });
      if (!recoveryCase)
        return res.status(404).json({ success: false, message: 'Dossier non trouvé' });

      await Reminder.create({
        recovery_case_id: recoveryCase.id,
        invoice_id: recoveryCase.invoice_id,
        client_id: recoveryCase.client_id,
        type: tpl.type,
        status: 'sent',
        sent_at: new Date(),
        response: `${tpl.label}: ${tpl.content}`,
        created_by: req.user.id,
      });

      if (recoveryCase.client?.user_id) {
        await Notification.create({
          user_id: recoveryCase.client.user_id,
          title: tpl.label,
          message: tpl.content,
          type: template === 'mise_en_demeure' ? 'error' : 'warning',
          related_entity_type: 'recovery_case',
          related_entity_id: recoveryCase.id,
        });
      }

      if (template === 'mise_en_demeure') {
        await recoveryCase.update({ status: 'legal' });
      } else if (recoveryCase.status === 'open') {
        await recoveryCase.update({ status: 'in_progress' });
      }

      res.status(201).json({ success: true, message: `${tpl.label} envoyé(e)` });
    } catch (err) {
      console.error('sendDunning error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getReminders: async (req, res) => {
    try {
      const rows = await Reminder.findAll({
        where: { recovery_case_id: req.params.id },
        include: [{ model: User, as: 'author', attributes: ['name'] }],
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
        type,
        status: 'sent',
        sent_at: new Date(),
        response,
        created_by: req.user.id,
      });

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
