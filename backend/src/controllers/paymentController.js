const { Payment, Invoice, Client, User } = require('../models');
const { closeRecoveryCasesForPaidInvoice } = require('../services/recoveryService');

const METHODS = {
  bank_transfer: 'Virement',
  credit_card: 'Carte bancaire',
  check: 'Chèque',
  cash: 'Espèces',
  direct_debit: 'Prélèvement',
};

const STATUS_LABELS = {
  success: 'Succès',
  pending: 'En attente de compensation',
  failed: 'Échoué / Rejeté',
};

const formatPaymentRow = (payment) => {
  const j = payment.toJSON();
  return {
    id: j.id,
    invoice_id: j.invoice_id,
    invoice_number: j.invoice?.invoice_number || null,
    client_id: j.client_id,
    client_name: j.client?.user?.name || null,
    company_name: j.client?.company_name || null,
    amount: Number(j.amount),
    payment_date: j.payment_date,
    payment_method: j.payment_method,
    payment_method_label: METHODS[j.payment_method] || j.payment_method,
    reference: j.reference,
    notes: j.notes,
    bank_name: j.bank_name || null,
    bank_agency: j.bank_agency || null,
    issuer_name: j.issuer_name || null,
    account_rib: j.account_rib || null,
    maturity_date: j.maturity_date || null,
    status: j.status || 'success',
    status_label: STATUS_LABELS[j.status || 'success'],
    recorded_by_name: j.recordedBy?.name || null,
    created_at: j.created_at,
  };
};

const paymentIncludes = [
  {
    model: Invoice,
    as: 'invoice',
    attributes: ['id', 'invoice_number', 'amount_ht', 'amount_ttc', 'amount_paid', 'tva_rate', 'issue_date', 'due_date', 'status'],
  },
  {
    model: Client,
    as: 'client',
    include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
  },
  { model: User, as: 'recordedBy', attributes: ['name', 'email'] },
];

const paymentController = {
  getAll: async (req, res) => {
    try {
      const { client_id, invoice_id, page = 1, limit = 20 } = req.query;
      const where = {};
      if (client_id) where.client_id = client_id;
      if (invoice_id) where.invoice_id = invoice_id;

      const { count, rows } = await Payment.findAndCountAll({
        where,
        include: paymentIncludes,
        order: [['payment_date', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      res.json({
        success: true,
        data: rows.map(formatPaymentRow),
        total: count,
      });
    } catch (err) {
      console.error('getAll payments error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const payment = await Payment.findByPk(req.params.id, { include: paymentIncludes });
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
      }

      const row = formatPaymentRow(payment);
      const invoice = payment.invoice?.toJSON();

      res.json({
        success: true,
        data: {
          ...row,
          transaction_id: `TXN-${String(payment.id).padStart(6, '0')}`,
          linked_invoice: invoice
            ? {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                amount_ttc: Number(invoice.amount_ttc),
                amount_paid: Number(invoice.amount_paid),
                balance_before: Math.max(Number(invoice.amount_paid) - Number(payment.amount), 0),
                balance_after: Math.max(Number(invoice.amount_ttc) - Number(invoice.amount_paid), 0),
                status: invoice.status,
                issue_date: invoice.issue_date,
                due_date: invoice.due_date,
              }
            : null,
        },
      });
    } catch (err) {
      console.error('getOne payment error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      const {
        invoice_id,
        amount,
        payment_date,
        payment_method,
        reference,
        notes,
        status = 'success',
        bank_name,
        bank_agency,
        issuer_name,
        account_rib,
        maturity_date,
      } = req.body;

      const invoice = await Invoice.findByPk(invoice_id);
      if (!invoice)
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });

      const payment = await Payment.create({
        invoice_id,
        client_id: invoice.client_id,
        amount,
        payment_date: payment_date || new Date(),
        payment_method,
        reference,
        notes,
        bank_name: bank_name || null,
        bank_agency: bank_agency || null,
        issuer_name: issuer_name || null,
        account_rib: account_rib || null,
        maturity_date: maturity_date || null,
        recorded_by: req.user.id,
        status,
      });

      if (status === 'success') {
        const newAmountPaid = Number(invoice.amount_paid) + Number(amount);
        let newStatus = invoice.status;
        if (newAmountPaid >= invoice.amount_ttc) newStatus = 'paid';
        else if (newAmountPaid > 0) newStatus = 'partially_paid';
        await invoice.update({ amount_paid: newAmountPaid, status: newStatus });

        let recoveryClosed = [];
        if (newStatus === 'paid') {
          recoveryClosed = await closeRecoveryCasesForPaidInvoice(invoice_id, req.user.id);
        }

        return res.status(201).json({
          success: true,
          id: payment.id,
          message: 'Paiement enregistré',
          new_status: newStatus,
          recovery_closed: recoveryClosed,
        });
      }

      res.status(201).json({ success: true, id: payment.id, message: 'Paiement enregistré (en attente)' });
    } catch (err) {
      console.error('create payment error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = paymentController;
