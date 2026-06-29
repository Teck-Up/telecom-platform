const NotificationRepository = require('../repositories/notification.repository');

class NotificationService {
    static async getUserNotifications(userId) {
        return await NotificationRepository.findAllByUserId(userId);
    }

    static async markAsRead(id, userId) {
        await NotificationRepository.markAsRead(id, userId);
    }

    static async markAllAsRead(userId) {
        await NotificationRepository.markAllAsRead(userId);
    }
}

module.exports = NotificationService;
