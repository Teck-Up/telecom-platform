const { sequelize, Invoice, InvoiceItem, Client } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const InvoiceRepository = require('../repositories/invoice.repository');

class InvoiceService {
    static generateInvoiceNumber() {
        const d = new Date();
        return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    }

    static async getAllInvoices(query, user) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where = {};
        if (query.status) where.status = query.status;
        if (query.search) where.invoice_number = { [Op.like]: `%${query.search}%` };

        // Logique métier : un client ne voit que ses factures
        if (user.role === 'client') {
            const client = await Client.findOne({ where: { user_id: user.id } });
            where.client_id = client?.id;
        } else if (query.client_id) {
            where.client_id = query.client_id;
        }

        const { count, rows } = await InvoiceRepository.findAll({ where, limit, offset });
        return { data: rows, total: count, page, limit };
    }

    static async getInvoiceById(id) {
        const invoice = await InvoiceRepository.findById(id);
        if (!invoice) {
            const error = new Error('Facture non trouvée');
            error.statusCode = 404;
            throw error;
        }
        return invoice;
    }

    static async createInvoice(data, billingAgentId) {
        const { client_id, due_date, description, items, tva_rate = 20 } = data;

        // Calculs métier
        const invoice_number = this.generateInvoiceNumber();
        const issue_date = new Date().toISOString().split('T')[0];
        const amount_ht = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
        const amount_ttc = amount_ht * (1 + tva_rate / 100);

        // Transaction pour garantir que la facture ET ses lignes sont créées ensemble
        const transaction = await sequelize.transaction();

        try {
            const invoice = await Invoice.create({
                invoice_number, client_id, billing_agent_id: billingAgentId,
                amount_ht, tva_rate, amount_ttc, due_date, issue_date, description,
            }, { transaction });

            // Création des lignes de facture
            const invoiceItems = items.map(item => ({
                invoice_id: invoice.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.quantity * item.unit_price,
            }));

            await InvoiceItem.bulkCreate(invoiceItems, { transaction });

            await transaction.commit();
            return { id: invoice.id, invoice_number };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateStatus(id, status) {
        await InvoiceRepository.update(id, { status });
    }

    static async checkOverdue() {
        const [updatedCount] = await InvoiceRepository.updateOverdue();
        return updatedCount;
    }

    static async generatePDFDocument(id) {
        const invoice = await this.getInvoiceById(id); // Réutilise la méthode existante

        const doc = new PDFDocument({ margin: 50 });

        // Construction du PDF
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

        return { doc, invoice_number: invoice.invoice_number };
    }
}

module.exports = InvoiceService;
