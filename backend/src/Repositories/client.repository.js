const { Client, User } = require('../models');
const { Op } = require('sequelize');

class ClientRepository {
    static async findAll({ search, status, limit, offset }) {
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

        return await Client.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'user',
                attributes: ['name', 'email'],
                where: Object.keys(userWhere).length ? userWhere : undefined,
                required: false
            }],
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });
    }

    static async findById(id) {
        return await Client.findByPk(id, {
            include: [{ model: User, as: 'user', attributes: ['name', 'email'] }],
        });
    }

    static async update(id, data) {
        const client = await Client.findByPk(id);
        if (!client) return null;
        return await client.update(data);
    }

    static async delete(id) {
        return await Client.destroy({ where: { id } });
    }
}

module.exports = ClientRepository;
