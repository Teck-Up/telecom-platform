const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET payments
router.get('/', authenticate, async (req, res) => {
  try {
    const { client_id, invoice_id, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT p.*, i.invoice_number, u.name as client_name, c.company_name, ua.name as recorded_by_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users ua ON p.recorded_by = ua.id
      WHERE 1=1
    `;
    const params = [];
    if (client_id) { query += ' AND p.client_id = ?'; params.push(client_id); }
    if (invoice_id) { query += ' AND p.invoice_id = ?'; params.push(invoice_id); }
    query += ' ORDER BY p.payment_date DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST record payment
router.post('/', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), async (req, res) => {
  try {
    const { invoice_id, amount, payment_date, payment_method, reference, notes } = req.body;

    const [[invoice]] = await db.query('SELECT * FROM invoices WHERE id = ?', [invoice_id]);
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

    await db.query(
      'INSERT INTO payments (invoice_id, client_id, amount, payment_date, payment_method, reference, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [invoice_id, invoice.client_id, amount, payment_date || new Date(), payment_method, reference, notes, req.user.id]
    );

    // Update invoice amount_paid and status
    const newAmountPaid = Number(invoice.amount_paid) + Number(amount);
    let newStatus = invoice.status;
    if (newAmountPaid >= invoice.amount_ttc) newStatus = 'paid';
    else if (newAmountPaid > 0) newStatus = 'partially_paid';

    await db.query(
      'UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?',
      [newAmountPaid, newStatus, invoice_id]
    );

    res.status(201).json({ success: true, message: 'Paiement enregistré', new_status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
