const bcrypt = require('bcrypt');
const { Client, User, Invoice } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

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
        include: [{ model: User, as: 'user', attributes: ['name', 'email'], where: Object.keys(userWhere).length ? userWhere : undefined, required: false }],
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        order: [['created_at', 'DESC']],
      });

      res.json({ success: true, data: rows, total: count, page: Number(page), limit: Number(limit) });
    } catch (err) {
      console.error('getAll clients error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id, {
        include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
      });
      if (!client)
        return res.status(404).json({ success: false, message: 'Client non trouvé' });
      res.json({ success: true, data: client });
    } catch (err) {
      console.error('getOne client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      const { name, email, password, company_name, phone, address, city, postal_code, country, contract_type, credit_limit } = req.body;

      const exists = await User.findOne({ where: { email } });
      if (exists)
        return res.status(409).json({ success: false, message: 'Email déjà utilisé' });

      const hashed = await bcrypt.hash(password || 'Client@123', 10);
      const user = await User.create({ name, email, password: hashed, role: 'client' });
      const client = await Client.create({
        user_id: user.id, company_name, phone, address, city,
        postal_code, country: country || 'France', contract_type: contract_type || 'postpaid',
        credit_limit: credit_limit || 0,
      });

      res.status(201).json({ success: true, id: client.id, message: 'Client créé' });
    } catch (err) {
      console.error('create client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  update: async (req, res) => {
    try {
      const client = await Client.findByPk(req.params.id);
      if (!client)
        return res.status(404).json({ success: false, message: 'Client non trouvé' });

      await client.update(req.body);
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
