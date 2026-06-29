const { Notification } = require('../models');

class NotificationRepository {
    static async findAllByUserId(userId, limit = 50) {
        return await Notification.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit,
        });
    }

    static async markAsRead(id, userId) {
        return await Notification.update(
            { is_read: true },
            { where: { id, user_id: userId } }
        );
    }

    static async markAllAsRead(userId) {
        return await Notification.update(
            { is_read: true },
            { where: { user_id: userId } }
        );
    }
}

module.exports = NotificationRepository;
