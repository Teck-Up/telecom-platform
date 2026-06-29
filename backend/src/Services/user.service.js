const bcrypt = require('bcrypt');
const UserRepository = require('../repositories/user.repository');

class UserService {
    static async getAllUsers() {
        return await UserRepository.findAll();
    }

    static async getUserById(id) {
        const user = await UserRepository.findById(id);
        if (!user) {
            const error = new Error('Utilisateur non trouvé');
            error.statusCode = 404;
            throw error;
        }
        return user;
    }

    static async updateUser(id, data) {
        // On s'assure de ne passer que les champs autorisés
        const updateData = {
            name: data.name,
            role: data.role,
            is_active: data.is_active
        };

        // On supprime les champs undefined pour ne pas écraser avec du vide
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await UserRepository.update(id, updateData);
    }

    static async updatePassword(targetUserId, requester, newPassword) {
        // 1. Vérification des droits (Logique métier)
        if (requester.role !== 'admin' && requester.id !== Number(targetUserId)) {
            const error = new Error('Accès refusé');
            error.statusCode = 403;
            throw error;
        }

        // 2. Vérification de la présence du mot de passe
        if (!newPassword) {
            const error = new Error('Mot de passe requis');
            error.statusCode = 400;
            throw error;
        }

        // 3. Hachage et mise à jour
        const hashed = await bcrypt.hash(newPassword, 10);
        await UserRepository.update(targetUserId, { password: hashed });
    }
}

module.exports = UserService;
