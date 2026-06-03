const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET all clients
router.get('/', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT c.*, u.name, u.email,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(CASE WHEN i.status IN ('overdue','sent','partially_paid') THEN i.amount_ttc - i.amount_paid ELSE 0 END), 0) as total_unpaid
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN invoices i ON c.id = i.client_id
      WHERE 1=1
    `;
    const params = [];
    if (search) { query += ' AND (u.name LIKE ? OR c.company_name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { query += ' AND c.status = ?'; params.push(status); }
    query += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await db.query(query, params);
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM clients');
    res.json({ success: true, data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET single client
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name, u.email FROM clients c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Client non trouvé' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST create client
router.post('/', authenticate, authorize('admin', 'billing_agent'), async (req, res) => {
  try {
    const { name, email, password, company_name, phone, address, city, postal_code, country, contract_type, credit_limit } = req.body;
    const bcrypt = require('bcrypt');
    const hashed = await bcrypt.hash(password || 'Client@123', 10);

    const [userResult] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, 'client']
    );
    const userId = userResult.insertId;

    const [clientResult] = await db.query(
      'INSERT INTO clients (user_id, company_name, phone, address, city, postal_code, country, contract_type, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, company_name, phone, address, city, postal_code, country || 'France', contract_type || 'postpaid', credit_limit || 0]
    );

    res.status(201).json({ success: true, id: clientResult.insertId, message: 'Client créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.code === 'ER_DUP_ENTRY' ? 'Email déjà utilisé' : 'Erreur serveur' });
  }
});

// PUT update client
router.put('/:id', authenticate, authorize('admin', 'billing_agent'), async (req, res) => {
  try {
    const { company_name, phone, address, city, postal_code, country, contract_type, credit_limit, status } = req.body;
    await db.query(
      'UPDATE clients SET company_name=?, phone=?, address=?, city=?, postal_code=?, country=?, contract_type=?, credit_limit=?, status=? WHERE id=?',
      [company_name, phone, address, city, postal_code, country, contract_type, credit_limit, status, req.params.id]
    );
    res.json({ success: true, message: 'Client mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// DELETE client
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Client supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
