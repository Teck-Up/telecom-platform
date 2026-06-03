const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticate, authorize } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
};

// GET all invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, client_id, page = 1, limit = 20, search } = req.query;
    let query = `
      SELECT i.*, u.name as client_name, c.company_name,
             ua.name as agent_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users ua ON i.billing_agent_id = ua.id
      WHERE 1=1
    `;
    const params = [];

    // Clients can only see their own invoices
    if (req.user.role === 'client') {
      const [[client]] = await db.query('SELECT id FROM clients WHERE user_id = ?', [req.user.id]);
      if (client) { query += ' AND i.client_id = ?'; params.push(client.id); }
    }
    if (status) { query += ' AND i.status = ?'; params.push(status); }
    if (client_id) { query += ' AND i.client_id = ?'; params.push(client_id); }
    if (search) { query += ' AND (i.invoice_number LIKE ? OR u.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET single invoice with items
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [[invoice]] = await db.query(
      `SELECT i.*, u.name as client_name, u.email as client_email, c.company_name, c.address, c.city
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

    const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...invoice, items } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST create invoice
router.post('/', authenticate, authorize('admin', 'billing_agent'), async (req, res) => {
  try {
    const { client_id, due_date, description, items, tva_rate = 20 } = req.body;
    const invoice_number = generateInvoiceNumber();
    const issue_date = new Date().toISOString().split('T')[0];

    const amount_ht = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const amount_ttc = amount_ht * (1 + tva_rate / 100);

    const [result] = await db.query(
      `INSERT INTO invoices (invoice_number, client_id, billing_agent_id, amount_ht, tva_rate, amount_ttc, due_date, issue_date, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [invoice_number, client_id, req.user.id, amount_ht, tva_rate, amount_ttc, due_date, issue_date, description]
    );

    const invoiceId = result.insertId;
    for (const item of items) {
      await db.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    res.status(201).json({ success: true, id: invoiceId, invoice_number, message: 'Facture créée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// PUT update invoice status
router.put('/:id/status', authenticate, authorize('admin', 'billing_agent', 'recovery_agent'), async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE invoices SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: 'Statut mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET generate PDF
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const [[invoice]] = await db.query(
      `SELECT i.*, u.name as client_name, u.email as client_email, c.company_name, c.address, c.city
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON c.user_id = u.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Facture non trouvée' });

    const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [req.params.id]);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice.invoice_number}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('FACTURE', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`N° ${invoice.invoice_number}`, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.text(`Échéance: ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').text('TelecomPlatform SAS');
    doc.fontSize(10).font('Helvetica').text('123 Avenue des Télécoms, 75001 Paris');

    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Facturé à :');
    doc.fontSize(10).font('Helvetica')
      .text(invoice.company_name || invoice.client_name)
      .text(invoice.address || '')
      .text(invoice.client_email);

    doc.moveDown(2);
    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, doc.y, { width: 250 });
    doc.text('Qté', 310, doc.y - 14, { width: 60, align: 'right' });
    doc.text('P.U. HT', 380, doc.y - 14, { width: 80, align: 'right' });
    doc.text('Total HT', 470, doc.y - 14, { width: 80, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    doc.font('Helvetica');
    for (const item of items) {
      doc.text(item.description, 50, doc.y + 5, { width: 250 });
      doc.text(item.quantity.toString(), 310, doc.y - 14, { width: 60, align: 'right' });
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
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur génération PDF' });
  }
});

// Mark overdue invoices (cron-like endpoint)
router.post('/check-overdue', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE invoices SET status = 'overdue' WHERE due_date < CURDATE() AND status IN ('sent', 'partially_paid')`
    );
    res.json({ success: true, updated: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
