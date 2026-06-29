const {
  Invoice, InvoiceItem, Client, User, Payment, RecoveryCase, Reminder, Notification,
} = require('../models');
const { Op, literal } = require('sequelize');
const PDFDocument = require('pdfkit');

const OPERATOR = {
  name: 'TelecomPlatform SAS',
  address: '123 Avenue des Télécoms, 75001 Paris',
  siret: '123 456 789 00012',
  email: 'facturation@telecom.fr',
  phone: '+33 1 23 45 67 89',
};

const STAFF_ROLES = ['admin', 'billing_agent', 'recovery_agent'];

const generateInvoiceNumber = () => {
  const d = new Date();
  return `FA-${d.getFullYear()}-${Date.now().toString().slice(-6)}`;
};

const ensureInvoiceAccess = async (req, res, invoiceId) => {
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [
      {
        model: Client,
        as: 'client',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      },
      { model: User, as: 'billingAgent', attributes: ['id', 'name', 'email'] },
      { model: InvoiceItem, as: 'items' },
    ],
  });

  if (!invoice) {
    res.status(404).json({ success: false, message: 'Facture non trouvée' });
    return null;
  }

  if (req.user.role === 'client') {
    const client = await Client.findOne({ where: { user_id: req.user.id } });
    if (!client || client.id !== invoice.client_id) {
      res.status(403).json({ success: false, message: 'Accès refusé' });
      return null;
    }
  }

  return invoice;
};

const formatInvoiceDetail = (invoice) => {
  const j = invoice.toJSON();
  const amountHt = Number(j.amount_ht);
  const amountTtc = Number(j.amount_ttc);
  const amountPaid = Number(j.amount_paid);
  const tvaAmount = amountTtc - amountHt;

  return {
    id: j.id,
    invoice_number: j.invoice_number,
    client_id: j.client_id,
    billing_agent_id: j.billing_agent_id,
    amount_ht: amountHt,
    amount_ttc: amountTtc,
    amount_paid: amountPaid,
    tva_rate: Number(j.tva_rate),
    tva_amount: tvaAmount,
    balance_due: Math.max(amountTtc - amountPaid, 0),
    issue_date: j.issue_date,
    due_date: j.due_date,
    status: j.status,
    description: j.description,
    created_at: j.created_at,
    updated_at: j.updated_at,
    items: (j.items || []).map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total: Number(item.total),
    })),
    issued_by: OPERATOR,
    billed_to: {
      company_name: j.client?.company_name || null,
      contact_name: j.client?.user?.name || null,
      email: j.client?.user?.email || null,
      phone: j.client?.phone || null,
      address: j.client?.address || null,
      city: j.client?.city || null,
      postal_code: j.client?.postal_code || null,
      country: j.client?.country || 'France',
      siret: j.client?.siret || null,
      ice: j.client?.ice || null,
    },
    billing_agent: j.billingAgent
      ? { id: j.billingAgent.id, name: j.billingAgent.name, email: j.billingAgent.email }
      : null,
  };
};

const buildInvoiceHistory = async (invoice) => {
  const events = [];

  events.push({
    id: `created-${invoice.id}`,
    type: 'created',
    label: 'Facture créée',
    description: `Facture ${invoice.invoice_number} émise`,
    occurred_at: invoice.created_at,
    actor: invoice.billingAgent?.name || 'Système',
  });

  if (invoice.status !== 'draft') {
    events.push({
      id: `sent-${invoice.id}`,
      type: 'sent',
      label: 'Facture envoyée',
      description: 'Document transmis au client',
      occurred_at: invoice.issue_date,
      actor: invoice.billingAgent?.name || 'Système',
    });
  }

  const payments = await Payment.findAll({
    where: { invoice_id: invoice.id },
    include: [{ model: User, as: 'recordedBy', attributes: ['name'] }],
    order: [['payment_date', 'ASC']],
  });

  for (const payment of payments) {
    const p = payment.toJSON();
    events.push({
      id: `payment-${p.id}`,
      type: 'payment',
      label: 'Paiement enregistré',
      description: `${Number(p.amount).toFixed(2)} € — ${p.reference || 'sans référence'}`,
      occurred_at: p.payment_date,
      actor: p.recordedBy?.name || 'Système',
    });
  }

  if (['overdue', 'partially_paid'].includes(invoice.status)
    || (invoice.status === 'sent' && new Date(invoice.due_date) < new Date())) {
    events.push({
      id: `overdue-${invoice.id}`,
      type: 'overdue',
      label: 'Facture en retard',
      description: `Échéance dépassée (${invoice.due_date})`,
      occurred_at: invoice.due_date,
      actor: 'Système',
    });
  }

  if (invoice.status === 'paid') {
    events.push({
      id: `paid-${invoice.id}`,
      type: 'paid',
      label: 'Facture soldée',
      description: 'Paiement intégral reçu',
      occurred_at: invoice.updated_at,
      actor: 'Système',
    });
  }

  const recoveryCases = await RecoveryCase.findAll({
    where: { invoice_id: invoice.id },
    order: [['created_at', 'ASC']],
  });

  for (const rc of recoveryCases) {
    events.push({
      id: `recovery-${rc.id}`,
      type: 'recovery',
      label: 'Dossier recouvrement ouvert',
      description: `Priorité ${rc.priority} — ${Number(rc.overdue_amount).toFixed(2)} € dus`,
      occurred_at: rc.created_at,
      actor: 'Recouvrement',
    });
  }

  const reminders = await Reminder.findAll({
    where: { invoice_id: invoice.id },
    include: [{ model: User, as: 'author', attributes: ['name'] }],
    order: [['sent_at', 'ASC']],
  });

  for (const rem of reminders) {
    const r = rem.toJSON();
    events.push({
      id: `reminder-${r.id}`,
      type: 'reminder',
      label: 'Relance envoyée',
      description: `Type: ${r.type}${r.response ? ` — ${r.response}` : ''}`,
      occurred_at: r.sent_at || r.created_at,
      actor: r.author?.name || 'Système',
    });
  }

  return events.sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
};

const invoiceController = {
  getAll: async (req, res) => {
    try {
      const { status, client_id, search, payable, page = 1, limit = 50 } = req.query;
      const where = {};

      if (payable === 'true') {
        where.status = { [Op.in]: ['sent', 'partially_paid', 'overdue'] };
        where[Op.and] = [
          literal('amount_paid < amount_ttc'),
        ];
      } else if (status) {
        where.status = status;
      }

      if (req.user.role === 'client') {
        const client = await Client.findOne({ where: { user_id: req.user.id } });
        where.client_id = client?.id;
      } else if (client_id) {
        where.client_id = client_id;
      }

      if (search) where.invoice_number = { [Op.like]: `%${search}%` };

      const { count, rows } = await Invoice.findAndCountAll({
        where,
        include: [
          { model: Client, as: 'client', include: [{ model: User, as: 'user', attributes: ['name', 'email'] }] },
          { model: User, as: 'billingAgent', attributes: ['name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      const data = rows.map((inv) => {
        const j = inv.toJSON();
        return {
          id: j.id,
          invoice_number: j.invoice_number,
          client_id: j.client_id,
          client_name: j.client?.user?.name || null,
          company_name: j.client?.company_name || null,
          amount_ttc: Number(j.amount_ttc),
          amount_paid: Number(j.amount_paid),
          balance_due: Math.max(Number(j.amount_ttc) - Number(j.amount_paid), 0),
          due_date: j.due_date,
          issue_date: j.issue_date,
          status: j.status,
        };
      });

      res.json({ success: true, data, total: count });
    } catch (err) {
      console.error('getAll invoices error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const invoice = await ensureInvoiceAccess(req, res, req.params.id);
      if (!invoice) return;
      res.json({ success: true, data: formatInvoiceDetail(invoice) });
    } catch (err) {
      console.error('getOne invoice error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getHistory: async (req, res) => {
    try {
      const invoice = await ensureInvoiceAccess(req, res, req.params.id);
      if (!invoice) return;
      const history = await buildInvoiceHistory(invoice);
      res.json({ success: true, data: history });
    } catch (err) {
      console.error('getHistory error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getPayments: async (req, res) => {
    try {
      const invoice = await ensureInvoiceAccess(req, res, req.params.id);
      if (!invoice) return;

      const METHODS = {
        bank_transfer: 'Virement',
        credit_card: 'Carte bancaire',
        check: 'Chèque',
        cash: 'Espèces',
        direct_debit: 'Prélèvement',
      };

      const rows = await Payment.findAll({
        where: { invoice_id: invoice.id },
        include: [{ model: User, as: 'recordedBy', attributes: ['name'] }],
        order: [['payment_date', 'DESC']],
      });

      const data = rows.map((p) => {
        const j = p.toJSON();
        return {
          id: j.id,
          amount: Number(j.amount),
          payment_date: j.payment_date,
          payment_method: j.payment_method,
          payment_method_label: METHODS[j.payment_method] || j.payment_method,
          reference: j.reference,
          notes: j.notes,
          status: j.status || 'success',
          recorded_by_name: j.recordedBy?.name || null,
        };
      });

      res.json({ success: true, data });
    } catch (err) {
      console.error('getInvoicePayments error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      const { client_id, due_date, description, items, tva_rate = 20 } = req.body;
      const invoice_number = generateInvoiceNumber();
      const issue_date = new Date().toISOString().split('T')[0];
      const amount_ht = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const amount_ttc = amount_ht * (1 + tva_rate / 100);

      const invoice = await Invoice.create({
        invoice_number,
        client_id,
        billing_agent_id: req.user.id,
        amount_ht,
        tva_rate,
        amount_ttc,
        due_date,
        issue_date,
        description,
        status: 'sent',
      });

      await Promise.all(items.map((item) =>
        InvoiceItem.create({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        })
      ));

      res.status(201).json({ success: true, id: invoice.id, invoice_number, message: 'Facture créée' });
    } catch (err) {
      console.error('create invoice error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const invoice = await ensureInvoiceAccess(req, res, req.params.id);
      if (!invoice) return;
      if (!STAFF_ROLES.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }
      await invoice.update({ status: req.body.status });
      res.json({ success: true, message: 'Statut mis à jour' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  sendReminder: async (req, res) => {
    try {
      const invoice = await ensureInvoiceAccess(req, res, req.params.id);
      if (!invoice) return;
      if (!STAFF_ROLES.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }

      const client = await Client.findByPk(invoice.client_id);
      if (client?.user_id) {
        await Notification.create({
          user_id: client.user_id,
          title: 'Relance de paiement',
          message: `Relance concernant la facture ${invoice.invoice_number} d'un montant de ${Number(invoice.amount_ttc - invoice.amount_paid).toFixed(2)} €.`,
          type: 'warning',
          related_entity_type: 'invoice',
          related_entity_id: invoice.id,
        });
      }

      const recoveryCase = await RecoveryCase.findOne({ where: { invoice_id: invoice.id } });
      if (recoveryCase) {
        await Reminder.create({
          recovery_case_id: recoveryCase.id,
          invoice_id: invoice.id,
          client_id: invoice.client_id,
          type: 'email',
          status: 'sent',
          sent_at: new Date(),
          response: 'Relance email envoyée depuis la fiche facture',
          created_by: req.user.id,
        });
      }

      res.json({ success: true, message: 'Relance envoyée par email' });
    } catch (err) {
      console.error('sendReminder error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  escalateToRecovery: async (req, res) => {
    try {
      const invoice = await ensureInvoiceAccess(req, res, req.params.id);
      if (!invoice) return;
      if (!['admin', 'recovery_agent', 'billing_agent'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }

      const existing = await RecoveryCase.findOne({ where: { invoice_id: invoice.id, status: { [Op.notIn]: ['resolved', 'closed'] } } });
      if (existing) {
        return res.json({ success: true, id: existing.id, message: 'Dossier recouvrement déjà ouvert', existing: true });
      }

      const overdue_days = Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date)) / 86400000));
      const overdue_amount = Number(invoice.amount_ttc) - Number(invoice.amount_paid);

      const recoveryCase = await RecoveryCase.create({
        client_id: invoice.client_id,
        invoice_id: invoice.id,
        recovery_agent_id: req.user.role === 'recovery_agent' ? req.user.id : null,
        overdue_amount,
        overdue_days,
        priority: overdue_days > 60 ? 'critical' : overdue_days > 30 ? 'high' : 'medium',
        notes: req.body.notes || 'Escalade depuis la fiche facture',
        status: 'open',
      });

      if (invoice.status !== 'overdue') {
        await invoice.update({ status: 'overdue' });
      }

      res.status(201).json({ success: true, id: recoveryCase.id, message: 'Dossier recouvrement créé' });
    } catch (err) {
      console.error('escalateToRecovery error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  generatePDF: async (req, res) => {
    try {
      const invoice = await ensureInvoiceAccess(req, res, req.params.id);
      if (!invoice) return;

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice.invoice_number}.pdf`);
      doc.pipe(res);

      doc.fontSize(24).font('Helvetica-Bold').text('FACTURE', { align: 'right' });
      doc.fontSize(10).font('Helvetica').text(`N° ${invoice.invoice_number}`, { align: 'right' });
      doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString('fr-FR')}`, { align: 'right' });
      doc.text(`Échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}`, { align: 'right' });
      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').text(OPERATOR.name);
      doc.fontSize(10).font('Helvetica').text(OPERATOR.address);
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text('Facturé à :');
      doc.fontSize(10).font('Helvetica')
        .text(invoice.client?.company_name || invoice.client?.user?.name || '')
        .text(invoice.client?.address || '')
        .text(invoice.client?.user?.email || '');
      doc.moveDown(2);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, doc.y, { width: 250 });
      doc.text('Qté', 310, doc.y - 14, { width: 60, align: 'right' });
      doc.text('P.U. HT', 380, doc.y - 14, { width: 80, align: 'right' });
      doc.text('Total HT', 470, doc.y - 14, { width: 80, align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();

      doc.font('Helvetica');
      for (const item of invoice.items) {
        doc.text(item.description, 50, doc.y + 5, { width: 250 });
        doc.text(String(item.quantity), 310, doc.y - 14, { width: 60, align: 'right' });
        doc.text(`${Number(item.unit_price).toFixed(2)} €`, 380, doc.y - 14, { width: 80, align: 'right' });
        doc.text(`${Number(item.total).toFixed(2)} €`, 470, doc.y - 14, { width: 80, align: 'right' });
      }

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(`Montant HT: ${Number(invoice.amount_ht).toFixed(2)} €`, { align: 'right' });
      doc.font('Helvetica').text(`TVA (${invoice.tva_rate}%): ${(invoice.amount_ttc - invoice.amount_ht).toFixed(2)} €`, { align: 'right' });
      doc.font('Helvetica-Bold').fontSize(14).text(`Total TTC: ${Number(invoice.amount_ttc).toFixed(2)} €`, { align: 'right' });
      doc.end();
    } catch (err) {
      console.error('generatePDF error:', err);
      res.status(500).json({ success: false, message: 'Erreur génération PDF' });
    }
  },

  checkOverdue: async (req, res) => {
    try {
      const [updated] = await Invoice.update(
        { status: 'overdue' },
        { where: { due_date: { [Op.lt]: new Date() }, status: { [Op.in]: ['sent', 'partially_paid'] } } }
      );
      res.json({ success: true, updated });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = invoiceController;
