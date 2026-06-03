const { Invoice, Client, Payment, RecoveryCase, User } = require('../models');
const { fn, col, literal, Op } = require('sequelize');

const dashboardController = {
  getStats: async (req, res) => {
    try {
      // Global totals
      const totalClients  = await Client.count();
      const totalInvoices = await Invoice.count();
      const overdueCount  = await Invoice.count({ where: { status: 'overdue' } });
      const paidCount     = await Invoice.count({ where: { status: 'paid' } });
      const recoveryCases = await RecoveryCase.count();

      const caResult = await Invoice.findOne({
        attributes: [
          [fn('COALESCE', fn('SUM', col('amount_ttc')), 0), 'total_ca'],
          [fn('COALESCE', fn('SUM', col('amount_paid')), 0), 'total_paid'],
          [fn('COALESCE', fn('SUM', literal(
            "CASE WHEN status IN ('overdue','sent','partially_paid') THEN amount_ttc - amount_paid ELSE 0 END"
          )), 0), 'total_unpaid'],
        ],
        raw: true,
      });

      const totals = {
        total_clients:  totalClients,
        total_invoices: totalInvoices,
        overdue_count:  overdueCount,
        paid_count:     paidCount,
        recovery_cases: recoveryCases,
        total_ca:       caResult?.total_ca || 0,
        total_paid:     caResult?.total_paid || 0,
        total_unpaid:   caResult?.total_unpaid || 0,
      };

      // Monthly CA (last 12 months)
      const monthlyCA = await Invoice.findAll({
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

      // Status distribution
      const statusDist = await Invoice.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount_ttc')), 'total']],
        group: ['status'],
        raw: true,
      });

      // Top unpaid clients
      const topUnpaid = await Invoice.findAll({
        attributes: [
          'client_id',
          [fn('SUM', literal('amount_ttc - amount_paid')), 'unpaid_amount'],
          [fn('COUNT', col('Invoice.id')), 'unpaid_invoices'],
        ],
        where: { status: { [Op.in]: ['overdue', 'sent', 'partially_paid'] } },
        include: [{ model: Client, as: 'client', attributes: ['company_name'], include: [{ model: User, as: 'user', attributes: ['name'] }] }],
        group: ['client_id'],
        order: [[literal('unpaid_amount'), 'DESC']],
        limit: 5,
        raw: false,
      });

      res.json({ success: true, data: { totals, monthlyCA, statusDist, topUnpaid } });
    } catch (err) {
      console.error('getStats error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getCA: async (req, res) => {
    try {
      const year = req.query.year || new Date().getFullYear();
      const data = await Invoice.findAll({
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
      res.json({ success: true, data });
    } catch (err) {
      console.error('getCA error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = dashboardController;
