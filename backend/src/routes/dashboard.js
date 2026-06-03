const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET dashboard stats
router.get('/stats', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(i.amount_ttc), 0) as total_ca,
        COALESCE(SUM(CASE WHEN i.status IN ('overdue','sent','partially_paid') THEN i.amount_ttc - i.amount_paid ELSE 0 END), 0) as total_unpaid,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END) as overdue_count,
        COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) as paid_count,
        COUNT(DISTINCT rc.id) as recovery_cases
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      LEFT JOIN payments p ON i.id = p.invoice_id
      LEFT JOIN recovery_cases rc ON c.id = rc.client_id
    `);

    // Monthly CA for last 12 months
    const [monthlyCA] = await db.query(`
      SELECT DATE_FORMAT(issue_date, '%Y-%m') as month,
             SUM(amount_ttc) as ca,
             SUM(amount_paid) as paid,
             COUNT(*) as invoices
      FROM invoices
      WHERE issue_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    // Invoice status distribution
    const [statusDist] = await db.query(`
      SELECT status, COUNT(*) as count, SUM(amount_ttc) as total
      FROM invoices
      GROUP BY status
    `);

    // Top unpaid clients
    const [topUnpaid] = await db.query(`
      SELECT c.id, u.name, c.company_name,
             SUM(i.amount_ttc - i.amount_paid) as unpaid_amount,
             COUNT(i.id) as unpaid_invoices
      FROM clients c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN invoices i ON c.id = i.client_id
      WHERE i.status IN ('overdue', 'sent', 'partially_paid')
      GROUP BY c.id
      ORDER BY unpaid_amount DESC
      LIMIT 5
    `);

    res.json({ success: true, data: { totals, monthlyCA, statusDist, topUnpaid } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET CA per month for current year
router.get('/ca', authenticate, authorize('admin'), async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const [rows] = await db.query(`
      SELECT DATE_FORMAT(issue_date, '%Y-%m') as month,
             SUM(amount_ttc) as ca,
             SUM(amount_paid) as collected
      FROM invoices
      WHERE YEAR(issue_date) = ?
      GROUP BY month ORDER BY month
    `, [year]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
