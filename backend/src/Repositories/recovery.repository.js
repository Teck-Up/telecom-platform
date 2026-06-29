const { RecoveryCase, Reminder, Invoice, Client, User, Notification } = require('../models');

class RecoveryRepository {
    // --- Dossiers de recouvrement (Recovery Cases) ---
    static async findAllCases({ where, limit, offset }) {
        return await RecoveryCase.findAll({
            where,
            include: [
                { model: Invoice, as: 'invoice', attributes: ['invoice_number', 'amount_ttc', 'due_date'] },
                { model: Client, as: 'client', include: [{ model: User, as: 'user', attributes: ['name'] }] },
                { model: User, as: 'agent', attributes: ['name'] },
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });
    }

    static async findCaseById(id, options = {}) {
        return await RecoveryCase.findByPk(id, options);
    }

    static async createCase(data) {
        return await RecoveryCase.create(data);
    }

    static async updateCase(id, data) {
        return await RecoveryCase.update(data, { where: { id } });
    }

    // --- Relances (Reminders) ---
    static async findRemindersByCaseId(caseId) {
        return await Reminder.findAll({
            where: { recovery_case_id: caseId },
            include: [{ model: User, as: 'createdByUser', attributes: ['name'], foreignKey: 'created_by' }],
            order: [['created_at', 'DESC']],
        });
    }

    static async createReminder(data, options = {}) {
        return await Reminder.create(data, options);
    }

    // --- Utilitaires pour le Service ---
    static async findInvoiceById(id) {
        return await Invoice.findByPk(id);
    }

    static async findClientById(id, options = {}) {
        return await Client.findByPk(id, options);
    }

    static async createNotification(data, options = {}) {
        return await Notification.create(data, options);
    }
}

module.exports = RecoveryRepository;
