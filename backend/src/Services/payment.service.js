const { sequelize, Invoice } = require('../models');
const PaymentRepository = require('../repositories/payment.repository');

class PaymentService {
    static async getAllPayments(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where = {};
        if (query.client_id) where.client_id = query.client_id;
        if (query.invoice_id) where.invoice_id = query.invoice_id;

        const rows = await PaymentRepository.findAll({ where, limit, offset });
        return { data: rows, page, limit };
    }

    static async createPayment(data, recordedById) {
        const { invoice_id, amount, payment_date, payment_method, reference, notes } = data;

        // Démarrage de la transaction pour sécuriser la double opération
        const transaction = await sequelize.transaction();

        try {
            // 1. Récupérer la facture (en l'associant à la transaction)
            const invoice = await Invoice.findByPk(invoice_id, { transaction });
            if (!invoice) {
                const error = new Error('Facture non trouvée');
                error.statusCode = 404;
                throw error;
            }

            // 2. Créer le paiement
            await PaymentRepository.create({
                invoice_id,
                client_id: invoice.client_id,
                amount,
                payment_date: payment_date || new Date(),
                payment_method,
                reference,
                notes,
                recorded_by: recordedById,
            }, { transaction });

            // 3. Logique métier : Calculer le nouveau montant et le nouveau statut
            const newAmountPaid = Number(invoice.amount_paid) + Number(amount);
            let newStatus = invoice.status;

            if (newAmountPaid >= invoice.amount_ttc) {
                newStatus = 'paid';
            } else if (newAmountPaid > 0) {
                newStatus = 'partially_paid';
            }

            // 4. Mettre à jour la facture
            await invoice.update(
                { amount_paid: newAmountPaid, status: newStatus },
                { transaction }
            );

            // 5. Valider la transaction si tout s'est bien passé
            await transaction.commit();

            return newStatus;

        } catch (error) {
            // En cas d'erreur, on annule tout (le paiement ne sera pas sauvegardé)
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = PaymentService;
