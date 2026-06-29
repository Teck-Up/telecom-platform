const { Invoice, InvoiceItem, Client, User } = require('../models');
const { Op } = require('sequelize');

class InvoiceRepository {
    static async findAll({ where, limit, offset }) {
        return await Invoice.findAndCountAll({
            where,
            include: [
                {
                    model: Client,
                    as: 'client',
                    include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
                },
                { model: User, as: 'billingAgent', attributes: ['name'] },
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset,
        });
    }

    static async findById(id) {
        return await Invoice.findByPk(id, {
            include: [
                {
                    model: Client,
                    as: 'client',
                    include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
                },
                { model: InvoiceItem, as: 'items' },
            ],
        });
    }

    static async update(id, data) {
        return await Invoice.update(data, { where: { id } });
    }

    static async updateOverdue() {
        return await Invoice.update(
            { status: 'overdue' },
            {
                where: {
                    due_date: { [Op.lt]: new Date() },
                    status: { [Op.in]: ['sent', 'partially_paid'] }
                }
            }
        );
    }
}

module.exports = InvoiceRepository;
