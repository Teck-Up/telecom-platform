const bcrypt = require('bcrypt');
const {
  Client, User, Invoice, Payment, RecoveryCase, sequelize,
} = require('../models');
const { Op } = require('sequelize');

const clientIncludes = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'is_active'] },
  {
    model: User,
    as: 'accountManager',
    attributes: ['id', 'name', 'email'],
    required: false,
  },
];

const formatClientRow = (client, stats = {}) => {
  const json = client.toJSON ? client.toJSON() : client;
  return {
    id: json.id,
    user_id: json.user_id,
    account_manager_id: json.account_manager_id,
    company_name: json.company_name,
    phone: json.phone,
    address: json.address,
    city: json.city,
    postal_code: json.postal_code,
    country: json.country,
    siret: json.siret,
    ice: json.ice,
    contract_type: json.contract_type,
    credit_limit: Number(json.credit_limit || 0),
    status: json.status,
    created_at: json.created_at,
    updated_at: json.updated_at,
    name: json.user?.name || null,
    email: json.user?.email || null,
    user_is_active: json.user?.is_active ?? true,
    account_manager: json.accountManager
      ? { id: json.accountManager.id, name: json.accountManager.name, email: json.accountManager.email }
      : null,
    ...stats,
  };
};

const getClientStats = async (clientId) => {
  const [[invoiceStats]] = await sequelize.query(
    `SELECT
       COUNT(*) AS invoice_count,
       COALESCE(SUM(amount_ttc), 0) AS total_billed_ttc,
       COALESCE(SUM(amount_paid), 0) AS total_paid,
       COALESCE(SUM(GREATEST(amount_ttc - amount_paid, 0)), 0) AS total_unpaid,
       SUM(CASE WHEN status IN ('overdue', 'partially_paid') OR (status = 'sent' AND due_date < CURDATE()) THEN 1 ELSE 0 END) AS overdue_count
     FROM invoices WHERE client_id = ?`,
    { replacements: [clientId] }
  );

  const [[payStats]] = await sequelize.query(
    `SELECT AVG(DATEDIFF(p.payment_date, i.issue_date)) AS avg_days
     FROM payments p
     INNER JOIN invoices i ON i.id = p.invoice_id
     WHERE p.client_id = ? AND i.status = 'paid'`,
    { replacements: [clientId] }
  );

  return {
    invoice_count: Number(invoiceStats.invoice_count || 0),
    total_billed_ttc: Number(invoiceStats.total_billed_ttc || 0),
    total_paid: Number(invoiceStats.total_paid || 0),
    total_unpaid: Number(invoiceStats.total_unpaid || 0),
    overdue_count: Number(invoiceStats.overdue_count || 0),
    average_days_to_pay: payStats.avg_days != null ? Math.round(Number(payStats.avg_days)) : null,
  };
};

const findClientOr404 = async (id, res) => {
  const client = await Client.findByPk(id, { include: clientIncludes });
  if (!client) {
    res.status(404).json({ success: false, message: 'Client non trouvé' });
    return null;
  }
  return client;
};

const clientController = {
  getAll: async (req, res) => {
    try {
      const { search, status, page = 1, limit = 20 } = req.query;
      const where = {};
      const userWhere = {};

      if (status) where.status = status;
      if (search) {
        userWhere[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
        where[Op.or] = [{ company_name: { [Op.like]: `%${search}%` } }];
      }

      const { count, rows } = await Client.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email'],
            where: Object.keys(userWhere).length ? userWhere : undefined,
            required: false,
          },
          { model: User, as: 'accountManager', attributes: ['name'], required: false },
        ],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [['created_at', 'DESC']],
      });

      const data = await Promise.all(
        rows.map(async (row) => formatClientRow(row, await getClientStats(row.id)))
      );

      res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) });
    } catch (err) {
      console.error('getAll clients error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const client = await findClientOr404(req.params.id, res);
      if (!client) return;

      const stats = await getClientStats(client.id);
      res.json({ success: true, data: formatClientRow(client, stats) });
    } catch (err) {
      console.error('getOne client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getFinancials: async (req, res) => {
    try {
      const client = await findClientOr404(req.params.id, res);
      if (!client) return;

      const stats = await getClientStats(client.id);

      const [[recoveryStats]] = await sequelize.query(
        `SELECT
           COUNT(*) AS open_cases,
           COALESCE(SUM(overdue_amount), 0) AS recovery_exposure,
           COALESCE(SUM(penalty_amount), 0) AS total_penalties
         FROM recovery_cases
         WHERE client_id = ? AND status NOT IN ('resolved', 'closed')`,
        { replacements: [client.id] }
      );

      res.json({
        success: true,
        data: {
          total_billed_ttc: stats.total_billed_ttc,
          total_paid: stats.total_paid,
          total_outstanding: stats.total_unpaid,
          average_days_to_pay: stats.average_days_to_pay,
          invoice_count: stats.invoice_count,
          overdue_count: stats.overdue_count,
          open_recovery_cases: Number(recoveryStats.open_cases || 0),
          recovery_exposure: Number(recoveryStats.recovery_exposure || 0),
          total_penalties: Number(recoveryStats.total_penalties || 0),
          credit_limit: Number(client.credit_limit || 0),
          credit_available: Math.max(Number(client.credit_limit || 0) - stats.total_unpaid, 0),
        },
      });
    } catch (err) {
      console.error('getFinancials error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getInvoices: async (req, res) => {
    try {
      const client = await findClientOr404(req.params.id, res);
      if (!client) return;

      const { search, status, page = 1, limit = 20 } = req.query;
      const where = { client_id: client.id };
      if (status) where.status = status;
      if (search) where.invoice_number = { [Op.like]: `%${search}%` };

      const { count, rows } = await Invoice.findAndCountAll({
        where,
        include: [{ model: User, as: 'billingAgent', attributes: ['name'] }],
        order: [['issue_date', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      const data = rows.map((inv) => {
        const j = inv.toJSON();
        return {
          id: j.id,
          invoice_number: j.invoice_number,
          amount_ht: Number(j.amount_ht),
          amount_ttc: Number(j.amount_ttc),
          amount_paid: Number(j.amount_paid),
          balance_due: Math.max(Number(j.amount_ttc) - Number(j.amount_paid), 0),
          tva_rate: Number(j.tva_rate),
          issue_date: j.issue_date,
          due_date: j.due_date,
          status: j.status,
          description: j.description,
          billing_agent_name: j.billingAgent?.name || null,
        };
      });

      res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) });
    } catch (err) {
      console.error('getClientInvoices error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getPayments: async (req, res) => {
    try {
      const client = await findClientOr404(req.params.id, res);
      if (!client) return;

      const { page = 1, limit = 20 } = req.query;

      const { count, rows } = await Payment.findAndCountAll({
        where: { client_id: client.id },
        include: [
          { model: Invoice, as: 'invoice', attributes: ['invoice_number', 'amount_ttc'] },
          { model: User, as: 'recordedBy', attributes: ['name'] },
        ],
        order: [['payment_date', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      const METHODS = {
        bank_transfer: 'Virement',
        credit_card: 'Carte',
        check: 'Chèque',
        cash: 'Espèces',
        direct_debit: 'Prélèvement',
      };

      const data = rows.map((p) => {
        const j = p.toJSON();
        return {
          id: j.id,
          invoice_id: j.invoice_id,
          invoice_number: j.invoice?.invoice_number || null,
          amount: Number(j.amount),
          payment_date: j.payment_date,
          payment_method: j.payment_method,
          payment_method_label: METHODS[j.payment_method] || j.payment_method,
          reference: j.reference,
          notes: j.notes,
          recorded_by_name: j.recordedBy?.name || null,
        };
      });

      res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) });
    } catch (err) {
      console.error('getClientPayments error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getRecoveryCases: async (req, res) => {
    try {
      const client = await findClientOr404(req.params.id, res);
      if (!client) return;

      const { status, page = 1, limit = 20 } = req.query;
      const where = { client_id: client.id };
      if (status) where.status = status;

      const { count, rows } = await RecoveryCase.findAndCountAll({
        where,
        include: [
          { model: Invoice, as: 'invoice', attributes: ['invoice_number', 'due_date'] },
          { model: User, as: 'agent', attributes: ['name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
      });

      const data = rows.map((c) => {
        const j = c.toJSON();
        return {
          id: j.id,
          invoice_id: j.invoice_id,
          invoice_number: j.invoice?.invoice_number || null,
          status: j.status,
          priority: j.priority,
          overdue_amount: Number(j.overdue_amount),
          penalty_amount: Number(j.penalty_amount || 0),
          overdue_days: j.overdue_days,
          notes: j.notes,
          agent_name: j.agent?.name || null,
          resolved_at: j.resolved_at,
          created_at: j.created_at,
        };
      });

      res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) });
    } catch (err) {
      console.error('getClientRecoveryCases error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!['active', 'suspended', 'terminated'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Statut invalide' });
      }

      const client = await findClientOr404(req.params.id, res);
      if (!client) return;

      await client.update({ status });
      res.json({ success: true, message: 'Statut mis à jour', data: { status } });
    } catch (err) {
      console.error('updateStatus error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      const {
        name, email, password, company_name, phone, address, city,
        postal_code, country, contract_type, credit_limit, siret, ice, account_manager_id,
      } = req.body;

      const exists = await User.findOne({ where: { email } });
      if (exists)
        return res.status(409).json({ success: false, message: 'Email déjà utilisé' });

      const hashed = await bcrypt.hash(password || 'Client@123', 10);
      const user = await User.create({ name, email, password: hashed, role: 'client' });
      const client = await Client.create({
        user_id: user.id,
        account_manager_id: account_manager_id || null,
        company_name,
        phone,
        address,
        city,
        postal_code,
        country: country || 'France',
        contract_type: contract_type || 'postpaid',
        credit_limit: credit_limit || 0,
        siret: siret || null,
        ice: ice || null,
      });

      res.status(201).json({ success: true, id: client.id, message: 'Client créé' });
    } catch (err) {
      console.error('create client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  update: async (req, res) => {
    try {
      const client = await findClientOr404(req.params.id, res);
      if (!client) return;

      const allowed = [
        'company_name', 'phone', 'address', 'city', 'postal_code', 'country',
        'contract_type', 'credit_limit', 'status', 'siret', 'ice', 'account_manager_id',
      ];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      await client.update(updates);
      res.json({ success: true, message: 'Client mis à jour' });
    } catch (err) {
      console.error('update client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  remove: async (req, res) => {
    try {
      await Client.destroy({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Client supprimé' });
    } catch (err) {
      console.error('delete client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = clientController;
