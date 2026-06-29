const { Invoice, Client, Payment, RecoveryCase, User } = require('../models');
const { fn, col, literal, Op } = require('sequelize');

const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'Virement',
  credit_card: 'Carte',
  check: 'Chèque',
  cash: 'Espèces',
  direct_debit: 'Prélèvement',
};

const formatTopUnpaid = (rows) =>
  rows.map((row) => {
    const j = row.toJSON();
    const client = j.client;
    return {
      client_id: j.client_id,
      name: client?.user?.name || null,
      company_name: client?.company_name || null,
      unpaid_invoices: Number(j.unpaid_invoices),
      unpaid_amount: Number(j.unpaid_amount),
    };
  });

const formatUpcomingDue = (rows) =>
  rows.map((row) => {
    const j = row.toJSON();
    const client = j.client;
    const balance = Math.max(Number(j.amount_ttc) - Number(j.amount_paid), 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(j.due_date);
    due.setHours(0, 0, 0, 0);
    return {
      id: j.id,
      invoice_number: j.invoice_number,
      client_name: client?.user?.name || null,
      company_name: client?.company_name || null,
      due_date: j.due_date,
      balance_due: balance,
      status: j.status,
      is_overdue: due < today,
    };
  });

const dashboardController = {
  getStats: async (req, res) => {
    try {
      const totalClients = await Client.count();
      const activeClients = await Client.count({ where: { status: 'active' } });
      const totalInvoices = await Invoice.count();
      const overdueCount = await Invoice.count({ where: { status: 'overdue' } });
      const paidCount = await Invoice.count({ where: { status: 'paid' } });
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

      const todayInvoiced = await Invoice.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('amount_ttc')), 0), 'total']],
        where: literal('DATE(created_at) = CURDATE()'),
        raw: true,
      });

      const monthCollected = await Payment.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
        where: {
          status: 'success',
          [Op.and]: literal('YEAR(payment_date) = YEAR(CURDATE()) AND MONTH(payment_date) = MONTH(CURDATE())'),
        },
        raw: true,
      });

      const recoveryResult = await RecoveryCase.findOne({
        attributes: [
          [fn('SUM', literal("CASE WHEN status IN ('open','in_progress','legal') THEN 1 ELSE 0 END")), 'open_count'],
          [fn('COALESCE', fn('SUM', literal(
            "CASE WHEN status IN ('open','in_progress','legal') THEN overdue_amount ELSE 0 END"
          )), 0), 'open_amount'],
          [fn('COALESCE', fn('SUM', col('penalty_amount')), 0), 'total_penalties'],
          [fn('SUM', literal(
            "CASE WHEN status = 'closed' AND resolved_at IS NOT NULL AND YEAR(resolved_at) = YEAR(CURDATE()) AND MONTH(resolved_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END"
          )), 'closed_this_month'],
        ],
        raw: true,
      });

      const totals = {
        total_clients: totalClients,
        active_clients: activeClients,
        total_invoices: totalInvoices,
        overdue_count: overdueCount,
        paid_count: paidCount,
        recovery_cases: recoveryCases,
        total_ca: Number(caResult?.total_ca || 0),
        total_paid: Number(caResult?.total_paid || 0),
        total_unpaid: Number(caResult?.total_unpaid || 0),
        invoiced_today: Number(todayInvoiced?.total || 0),
        collected_this_month: Number(monthCollected?.total || 0),
      };

      const recovery = {
        open_count: Number(recoveryResult?.open_count || 0),
        open_amount: Number(recoveryResult?.open_amount || 0),
        total_penalties: Number(recoveryResult?.total_penalties || 0),
        closed_this_month: Number(recoveryResult?.closed_this_month || 0),
      };

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

      const statusDist = await Invoice.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('amount_ttc')), 'total']],
        group: ['status'],
        raw: true,
      });

      const paymentMethodsRaw = await Payment.findAll({
        attributes: [
          'payment_method',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('amount')), 'total'],
        ],
        where: { status: 'success' },
        group: ['payment_method'],
        order: [[literal('total'), 'DESC']],
        raw: true,
      });

      const paymentMethods = paymentMethodsRaw.map((row) => ({
        method: row.payment_method,
        label: PAYMENT_METHOD_LABELS[row.payment_method] || row.payment_method,
        count: Number(row.count),
        total: Number(row.total),
      }));

      const topUnpaidRows = await Invoice.findAll({
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
          include: [{ model: User, as: 'user', attributes: ['name'] }],
        }],
        group: ['client_id'],
        order: [[literal('unpaid_amount'), 'DESC']],
        limit: 5,
      });

      const upcomingDueRows = await Invoice.findAll({
        attributes: ['id', 'invoice_number', 'due_date', 'status', 'amount_ttc', 'amount_paid'],
        where: {
          status: { [Op.in]: ['sent', 'partially_paid', 'overdue'] },
          due_date: { [Op.lte]: literal('DATE_ADD(CURDATE(), INTERVAL 30 DAY)') },
        },
        include: [{
          model: Client,
          as: 'client',
          attributes: ['company_name'],
          include: [{ model: User, as: 'user', attributes: ['name'] }],
        }],
        order: [['due_date', 'ASC']],
        limit: 10,
      });

      res.json({
        success: true,
        data: {
          totals,
          recovery,
          monthlyCA,
          statusDist,
          paymentMethods,
          topUnpaid: formatTopUnpaid(topUnpaidRows),
          upcomingDue: formatUpcomingDue(upcomingDueRows),
        },
      });
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
