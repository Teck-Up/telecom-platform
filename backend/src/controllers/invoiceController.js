const { Invoice, InvoiceItem, Client, User } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

const generateInvoiceNumber = () => {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
};

const invoiceController = {
  getAll: async (req, res) => {
    try {
      const { status, client_id, search, page = 1, limit = 20 } = req.query;
      const where = {};
      if (status) where.status = status;

      // Clients see only their own invoices
      if (req.user.role === 'client') {
        const client = await Client.findOne({ where: { user_id: req.user.id } });
        where.client_id = client?.id;
      } else if (client_id) {
        where.client_id = client_id;
      }

      if (search) where.invoice_number = { [Op.like]: `%${search}%` };

      const { rows } = await Invoice.findAndCountAll({
        where,
        include: [
          { model: Client, as: 'client', include: [{ model: User, as: 'user', attributes: ['name', 'email'] }] },
          { model: User, as: 'billingAgent', attributes: ['name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('getAll invoices error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [
          { model: Client, as: 'client', include: [{ model: User, as: 'user', attributes: ['name', 'email'] }] },
          { model: InvoiceItem, as: 'items' },
        ],
      });
      if (!invoice)
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });
      res.json({ success: true, data: invoice });
    } catch (err) {
      console.error('getOne invoice error:', err);
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
        invoice_number, client_id, billing_agent_id: req.user.id,
        amount_ht, tva_rate, amount_ttc, due_date, issue_date, description,
      });

      await Promise.all(items.map(item =>
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
      await Invoice.update({ status: req.body.status }, { where: { id: req.params.id } });
      res.json({ success: true, message: 'Statut mis à jour' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  generatePDF: async (req, res) => {
    try {
      const invoice = await Invoice.findByPk(req.params.id, {
        include: [
          { model: Client, as: 'client', include: [{ model: User, as: 'user', attributes: ['name', 'email'] }] },
          { model: InvoiceItem, as: 'items' },
        ],
      });
      if (!invoice)
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice.invoice_number}.pdf`);
      doc.pipe(res);

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
        .text(invoice.client?.company_name || invoice.client?.user?.name || '')
        .text(invoice.client?.address || '')
        .text(invoice.client?.user?.email || '');
      doc.moveDown(2);

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, doc.y, { width: 250 });
      doc.text('Qté',     310, doc.y - 14, { width: 60,  align: 'right' });
      doc.text('P.U. HT', 380, doc.y - 14, { width: 80,  align: 'right' });
      doc.text('Total HT',470, doc.y - 14, { width: 80,  align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();

      doc.font('Helvetica');
      for (const item of invoice.items) {
        doc.text(item.description,                           50,  doc.y + 5, { width: 250 });
        doc.text(String(item.quantity),                     310,  doc.y - 14, { width: 60,  align: 'right' });
        doc.text(`${Number(item.unit_price).toFixed(2)} €`, 380,  doc.y - 14, { width: 80,  align: 'right' });
        doc.text(`${Number(item.total).toFixed(2)} €`,      470,  doc.y - 14, { width: 80,  align: 'right' });
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
