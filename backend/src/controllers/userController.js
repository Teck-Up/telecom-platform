const bcrypt = require('bcrypt');
const { User } = require('../models');

const userController = {
  getAll: async (req, res) => {
    try {
      const data = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error('getAll users error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
      });
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  update: async (req, res) => {
    try {
      const { name, role, is_active } = req.body;
      await User.update({ name, role, is_active }, { where: { id: req.params.id } });
      res.json({ success: true, message: 'Utilisateur mis à jour' });
    } catch (err) {
      console.error('update user error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  updatePassword: async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.id !== Number(req.params.id))
        return res.status(403).json({ success: false, message: 'Accès refusé' });

      const { password } = req.body;
      if (!password)
        return res.status(400).json({ success: false, message: 'Mot de passe requis' });

      const hashed = await bcrypt.hash(password, 10);
      await User.update({ password: hashed }, { where: { id: req.params.id } });
      res.json({ success: true, message: 'Mot de passe mis à jour' });
    } catch (err) {
      console.error('updatePassword error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = userController;
