const { Notification } = require('../models');

const notificationController = {
  getAll: async (req, res) => {
    try {
      const data = await Notification.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
        limit: 50,
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error('getAll notifications error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  markRead: async (req, res) => {
    try {
      await Notification.update(
        { is_read: true },
        { where: { id: req.params.id, user_id: req.user.id } }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  markAllRead: async (req, res) => {
    try {
      await Notification.update(
        { is_read: true },
        { where: { user_id: req.user.id } }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = notificationController;
