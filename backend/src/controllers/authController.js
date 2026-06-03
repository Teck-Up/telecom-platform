const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

      const user = await User.findOne({ where: { email, is_active: true } });
      if (!user)
        return res.status(401).json({ success: false, message: 'Identifiants invalides' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return res.status(401).json({ success: false, message: 'Identifiants invalides' });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ success: false, message: 'Champs requis manquants' });

      const exists = await User.findOne({ where: { email } });
      if (exists)
        return res.status(409).json({ success: false, message: 'Email déjà utilisé' });

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashed, role: role || 'client' });

      res.status(201).json({ success: true, message: 'Utilisateur créé', id: user.id });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = authController;
