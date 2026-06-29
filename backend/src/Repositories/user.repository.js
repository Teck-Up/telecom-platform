const { User } = require('../models');

class UserRepository {
    // --- Méthodes pour l'Authentification ---
    static async findByEmail(email) {
        return await User.findOne({ where: { email } });
    }

    static async create(userData) {
        return await User.create(userData);
    }

    // --- Méthodes pour la gestion des Utilisateurs ---
    static async findAll() {
        return await User.findAll({
            attributes: { exclude: ['password'] }, // On ne renvoie jamais les mots de passe
            order: [['created_at', 'DESC']],
        });
    }

    static async findById(id) {
        return await User.findByPk(id, {
            attributes: { exclude: ['password'] },
        });
    }

    static async update(id, data) {
        // Sequelize update retourne un tableau avec le nombre de lignes modifiées
        return await User.update(data, { where: { id } });
    }
}

module.exports = UserRepository;
