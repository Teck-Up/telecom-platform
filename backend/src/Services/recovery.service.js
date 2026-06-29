const { sequelize } = require('../models');
const RecoveryRepository = require('../repositories/recovery.repository');

class RecoveryService {
    static async getAllCases(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where = {};
        if (query.status) where.status = query.status;
        if (query.priority) where.priority = query.priority;

        const rows = await RecoveryRepository.findAllCases({ where, limit, offset });
        return { data: rows, page, limit };
    }

    static async createCase(data, agentId) {
        const { client_id, invoice_id, priority, notes } = data;

        // 1. Vérifier la facture
        const invoice = await RecoveryRepository.findInvoiceById(invoice_id);
        if (!invoice) {
            const error = new Error('Facture non trouvée');
            error.statusCode = 404;
            throw error;
        }

        // 2. Logique métier : Calcul des retards
        const overdue_days = Math.max(0, Math.floor((new Date() - new Date(invoice.due_date)) / 86400000));
        const overdue_amount = invoice.amount_ttc - invoice.amount_paid;

        // 3. Création du dossier
        const recoveryCase = await RecoveryRepository.createCase({
            client_id,
            invoice_id,
            recovery_agent_id: agentId,
            overdue_amount,
            overdue_days,
            priority: priority || 'medium',
            notes,
        });

        return recoveryCase.id;
    }

    static async updateCase(id, data) {
        const { status, priority, notes } = data;

        // Logique métier : si le statut passe à "resolved", on set la date
        const resolved_at = status === 'resolved' ? new Date() : null;

        await RecoveryRepository.updateCase(id, { status, priority, notes, resolved_at });
    }

    static async getReminders(caseId) {
        return await RecoveryRepository.findRemindersByCaseId(caseId);
    }

    static async sendReminder(caseId, data, agentId) {
        const { type, response } = data;

        // 1. Vérifier le dossier
        const recoveryCase = await RecoveryRepository.findCaseById(caseId);
        if (!recoveryCase) {
            const error = new Error('Dossier non trouvé');
            error.statusCode = 404;
            throw error;
        }

        // 2. Démarrer une transaction (Création Relance + Notification)
        const transaction = await sequelize.transaction();

        try {
            // Créer la relance
            await RecoveryRepository.createReminder({
                recovery_case_id: recoveryCase.id,
                invoice_id: recoveryCase.invoice_id,
                client_id: recoveryCase.client_id,
                type,
                status: 'sent',
                sent_at: new Date(),
                response,
                created_by: agentId,
            }, { transaction });

            // Récupérer le client pour le notifier
            const client = await RecoveryRepository.findClientById(recoveryCase.client_id, { transaction });

            if (client?.user_id) {
                await RecoveryRepository.createNotification({
                    user_id: client.user_id,
                    title: 'Relance de paiement',
                    message: 'Une relance a été envoyée concernant votre facture en retard de paiement.',
                    type: 'warning',
                }, { transaction });
            }

            // Valider la transaction
            await transaction.commit();

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = RecoveryService;
