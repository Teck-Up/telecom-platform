const { Payment, Invoice, Client, User } = require('../models');

const paymentController = {
  getAll: async (req, res) => {
    try {
      const { client_id, invoice_id, page = 1, limit = 20 } = req.query;
      const where = {};
      if (client_id)  where.client_id  = client_id;
      if (invoice_id) where.invoice_id = invoice_id;

      const rows = await Payment.findAll({
        where,
        include: [
          { model: Invoice,  as: 'invoice',    attributes: ['invoice_number'] },
          { model: Client,   as: 'client',     include: [{ model: User, as: 'user', attributes: ['name'] }] },
          { model: User,     as: 'recordedBy', attributes: ['name'] },
        ],
        order: [['payment_date', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('getAll payments error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      const { invoice_id, amount, payment_date, payment_method, reference, notes } = req.body;

      const invoice = await Invoice.findByPk(invoice_id);
      if (!invoice)
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });

      await Payment.create({
        invoice_id,
        client_id: invoice.client_id,
        amount,
        payment_date: payment_date || new Date(),
        payment_method,
        reference,
        notes,
        recorded_by: req.user.id,
      });

      // Update invoice paid amount + status
      const newAmountPaid = Number(invoice.amount_paid) + Number(amount);
      let newStatus = invoice.status;
      if (newAmountPaid >= invoice.amount_ttc) newStatus = 'paid';
      else if (newAmountPaid > 0) newStatus = 'partially_paid';

      await invoice.update({ amount_paid: newAmountPaid, status: newStatus });

      res.status(201).json({ success: true, message: 'Paiement enregistré', new_status: newStatus });
    } catch (err) {
      console.error('create payment error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = paymentController;
