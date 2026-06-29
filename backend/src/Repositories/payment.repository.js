const { Payment, Invoice, Client, User } = require('../models');

class PaymentRepository {
    static async findAll({ where, limit, offset }) {
        return await Payment.findAll({
            where,
            include: [
                { model: Invoice, as: 'invoice', attributes: ['invoice_number'] },
                { model: Client, as: 'client', include: [{ model: User, as: 'user', attributes: ['name'] }] },
                { model: User, as: 'recordedBy', attributes: ['name'] },
            ],
            order: [['payment_date', 'DESC']],
            limit,
            offset,
        });
    }

    // On accepte un objet "options" pour pouvoir passer la transaction depuis le Service
    static async create(data, options = {}) {
        return await Payment.create(data, options);
    }
}

module.exports = PaymentRepository;
