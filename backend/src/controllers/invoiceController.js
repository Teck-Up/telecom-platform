const InvoiceService = require('../services/invoice.service');

const invoiceController = {
  getAll: async (req, res) => {
    try {
      const result = await InvoiceService.getAllInvoices(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('getAll invoices error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const invoice = await InvoiceService.getInvoiceById(req.params.id);
      res.json({ success: true, data: invoice });
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      console.error('getOne invoice error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      // req.user.id est l'agent qui crée la facture
      const result = await InvoiceService.createInvoice(req.body, req.user.id);
      res.status(201).json({ success: true, id: result.id, invoice_number: result.invoice_number, message: 'Facture créée' });
    } catch (err) {
      console.error('create invoice error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  updateStatus: async (req, res) => {
    try {
      await InvoiceService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, message: 'Statut mis à jour' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  generatePDF: async (req, res) => {
    try {
      const { doc, invoice_number } = await InvoiceService.generatePDFDocument(req.params.id);

      // Le contrôleur gère uniquement l'aspect HTTP (les headers et le flux de réponse)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice_number}.pdf`);

      doc.pipe(res);
      doc.end();
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
      console.error('generatePDF error:', err);
      res.status(500).json({ success: false, message: 'Erreur génération PDF' });
    }
  },

  checkOverdue: async (req, res) => {
    try {
      const updated = await InvoiceService.checkOverdue();
      res.json({ success: true, updated });
    } catch (err) {
      console.error('checkOverdue error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = invoiceController;
