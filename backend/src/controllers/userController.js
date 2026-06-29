const UserService = require('../services/user.service');

const userController = {
  getAll: async (req, res) => {
    try {
      const data = await UserService.getAllUsers();
      res.json({ success: true, data });
    } catch (err) {
      console.error('getAll users error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getMe: async (req, res) => {
    try {
      // req.user.id vient du middleware authenticate
      const user = await UserService.getUserById(req.user.id);
      res.json({ success: true, data: user });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  update: async (req, res) => {
    try {
      // Idéalement, on utiliserait ici le UpdateUserDTO via le middleware validateDto
      const { name, role, is_active } = req.body;

      await UserService.updateUser(req.params.id, { name, role, is_active });
      res.json({ success: true, message: 'Utilisateur mis à jour' });
    } catch (err) {
      console.error('update user error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  updatePassword: async (req, res) => {
    try {
      // On passe l'ID cible, l'utilisateur qui fait la requête (req.user), et le nouveau mot de passe
      await UserService.updatePassword(req.params.id, req.user, req.body.password);
      res.json({ success: true, message: 'Mot de passe mis à jour' });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      console.error('updatePassword error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = userController;
