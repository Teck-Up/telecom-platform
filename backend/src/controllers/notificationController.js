const NotificationService = require('../services/notification.service');

const notificationController = {
  getAll: async (req, res) => {
    try {
      // req.user.id vient du middleware d'authentification
      const data = await NotificationService.getUserNotifications(req.user.id);
      res.json({ success: true, data });
    } catch (err) {
      console.error('getAll notifications error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  markRead: async (req, res) => {
    try {
      await NotificationService.markAsRead(req.params.id, req.user.id);
      res.json({ success: true, message: 'Notification marquée comme lue' });
    } catch (err) {
      console.error('markRead error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  markAllRead: async (req, res) => {
    try {
      await NotificationService.markAllAsRead(req.user.id);
      res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues' });
    } catch (err) {
      console.error('markAllRead error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = notificationController;
