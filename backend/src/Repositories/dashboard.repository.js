const { Invoice, Client, RecoveryCase, User } = require('../models');
const { fn, col, literal, Op } = require('sequelize');

class DashboardRepository {
    static async getCounts() {
        const totalClients = await Client.count();
        const totalInvoices = await Invoice.count();
        const overdueCount = await Invoice.count({ where: { status: 'overdue' } });
        const paidCount = await Invoice.count({ where: { status: 'paid' } });
        const recoveryCases = await RecoveryCase.count();

        return { totalClients, totalInvoices, overdueCount, paidCount, recoveryCases };
    }

    static async getGlobalCA() {
        return await Invoice.findOne({
            attributes: [
                [fn('COALESCE', fn('SUM', col('amount_ttc')), 0), 'total_ca'],
                [fn('COALESCE', fn('SUM', col('amount_paid')), 0), 'total_paid'],
                [fn('COALESCE', fn('SUM', literal(
                    "CASE WHEN status IN ('overdue','sent','partially_paid') THEN amount_ttc - amount_paid ELSE 0 END"
                )), 0), 'total_unpaid'],
            ],
            raw: true,
        });
    }

    static async getMonthlyCA() {
        return await Invoice.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('issue_date'), '%Y-%m'), 'month'],
                [fn('SUM', col('amount_ttc')), 'ca'],
                [fn('SUM', col('amount_paid')), 'paid'],
                [fn('COUNT', col('id')), 'invoices'],
            ],
            where: { issue_date: { [Op.gte]: literal('DATE_SUB(CURDATE(), INTERVAL 12 MONTH)') } },
            group: [literal("DATE_FORMAT(issue_date, '%Y-%m')")],
            order: [[literal("DATE_FORMAT(issue_date, '%Y-%m')"), 'ASC']],
            raw: true,
        });
    }

    static async getStatusDistribution() {
        return await Invoice.findAll({
            attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount_ttc')), 'total']],
            group: ['status'],
            raw: true,
        });
    }

    static async getTopUnpaidClients() {
        return await Invoice.findAll({
            attributes: [
                'client_id',
                [fn('SUM', literal('amount_ttc - amount_paid')), 'unpaid_amount'],
                [fn('COUNT', col('Invoice.id')), 'unpaid_invoices'],
            ],
            where: { status: { [Op.in]: ['overdue', 'sent', 'partially_paid'] } },
            include: [{
                model: Client,
                as: 'client',
                attributes: ['company_name'],
                include: [{ model: User, as: 'user', attributes: ['name'] }]
            }],
            group: ['client_id'],
            order: [[literal('unpaid_amount'), 'DESC']],
            limit: 5,
            raw: false,
        });
    }

    static async getCAByYear(year) {
        return await Invoice.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('issue_date'), '%Y-%m'), 'month'],
                [fn('SUM', col('amount_ttc')), 'ca'],
                [fn('SUM', col('amount_paid')), 'collected'],
            ],
            where: literal(`YEAR(issue_date) = ${year}`),
            group: [literal("DATE_FORMAT(issue_date, '%Y-%m')")],
            order: [[literal("DATE_FORMAT(issue_date, '%Y-%m')"), 'ASC']],
            raw: true,
        });
    }
}

module.exports = DashboardRepository;
