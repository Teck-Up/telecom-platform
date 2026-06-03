const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET all recovery cases
router.get('/', authenticate, authorize('admin', 'recovery_agent'), async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT rc.*, i.invoice_number, i.amount_ttc, i.due_date,
             u.name as client_name, c.company_name,
             ua.name as agent_name
      FROM recovery_cases rc
      LEFT JOIN invoices i ON rc.invoice_id = i.id
      LEFT JOIN clients c ON rc.client_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users ua ON rc.recovery_agent_id = ua.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND rc.status = ?'; params.push(status); }
    if (priority) { query += ' AND rc.priority = ?'; params.push(priority); }
    query += ' ORDER BY rc.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST create recovery case
router.post('/', authenticate, authorize('admin', 'recovery_agent'), async (req, res) => {
  try {
    const { client_id, invoice_id, priority, notes } = req.body;
    const [[invoice]] = await db.query('SELECT * FROM invoices WHERE id = ?', [invoice_id]);
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

    const overdue_days = Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
    const overdue_amount = invoice.amount_ttc - invoice.amount_paid;

    const [result] = await db.query(
      `INSERT INTO recovery_cases (client_id, invoice_id, recovery_agent_id, overdue_amount, overdue_days, priority, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [client_id, invoice_id, req.user.id, overdue_amount, overdue_days, priority || 'medium', notes]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Dossier de recouvrement créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT update recovery case
router.put('/:id', authenticate, authorize('admin', 'recovery_agent'), async (req, res) => {
  try {
    const { status, priority, notes } = req.body;
    const resolved_at = status === 'resolved' ? new Date() : null;
    await db.query(
      'UPDATE recovery_cases SET status=?, priority=?, notes=?, resolved_at=? WHERE id=?',
      [status, priority, notes, resolved_at, req.params.id]
    );
    res.json({ success: true, message: 'Dossier mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET reminders for a case
router.get('/:id/reminders', authenticate, authorize('admin', 'recovery_agent'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT r.*, u.name as created_by_name FROM reminders r LEFT JOIN users u ON r.created_by = u.id WHERE r.recovery_case_id = ? ORDER BY r.created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST send reminder
router.post('/:id/reminders', authenticate, authorize('admin', 'recovery_agent'), async (req, res) => {
  try {
    const { type, response } = req.body;
    const [[rc]] = await db.query('SELECT * FROM recovery_cases WHERE id = ?', [req.params.id]);
    if (!rc) return res.status(404).json({ success: false, message: 'Dossier non trouvé' });

    await db.query(
      'INSERT INTO reminders (recovery_case_id, invoice_id, client_id, type, status, sent_at, response, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, rc.invoice_id, rc.client_id, type, 'sent', new Date(), response, req.user.id]
    );

    // Create notification for client
    const [[client]] = await db.query('SELECT user_id FROM clients WHERE id = ?', [rc.client_id]);
    if (client?.user_id) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [client.user_id, 'Relance de paiement', `Une relance a été envoyée concernant votre facture en retard.`, 'warning']
      );
    }

    res.status(201).json({ success: true, message: 'Relance envoyée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
