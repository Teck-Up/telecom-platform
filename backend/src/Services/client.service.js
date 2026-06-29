const bcrypt = require('bcrypt');
const { sequelize, User, Client } = require('../models'); // Import de sequelize pour la transaction
const ClientRepository = require('../repositories/client.repository');
const UserRepository = require('../repositories/user.repository'); // On réutilise le repo créé précédemment

class ClientService {
    static async getAllClients(query) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const { count, rows } = await ClientRepository.findAll({
            search: query.search,
            status: query.status,
            limit,
            offset
        });

        return { data: rows, total: count, page, limit };
    }

    static async getClientById(id) {
        const client = await ClientRepository.findById(id);
        if (!client) {
            const error = new Error('Client non trouvé');
            error.statusCode = 404;
            throw error;
        }
        return client;
    }

    static async createClient(userData, clientData) {
        // 1. Vérifier si l'email existe déjà
        const exists = await UserRepository.findByEmail(userData.email);
        if (exists) {
            const error = new Error('Email déjà utilisé');
            error.statusCode = 409;
            throw error;
        }

        // 2. Démarrer une transaction pour garantir l'intégrité des données
        const transaction = await sequelize.transaction();

        try {
            // Hachage du mot de passe
            const hashed = await bcrypt.hash(userData.password || 'Client@123', 10);

            // Création du User (lié à la transaction)
            const user = await User.create(
                {
                    name: userData.name,
                    email: userData.email,
                    password: hashed,
                    role: 'client'
                },
                { transaction }
            );

            // Création du Client (lié à la transaction)
            const client = await Client.create(
                {
                    user_id: user.id,
                    company_name: clientData.company_name,
                    phone: clientData.phone,
                    address: clientData.address,
                    city: clientData.city,
                    postal_code: clientData.postal_code,
                    country: clientData.country || 'France',
                    contract_type: clientData.contract_type || 'postpaid',
                    credit_limit: clientData.credit_limit || 0,
                },
                { transaction }
            );

            // Si tout est OK, on valide la transaction
            await transaction.commit();
            return client.id;

        } catch (error) {
            // En cas d'erreur (ex: problème de base de données), on annule tout
            await transaction.rollback();
            throw error;
        }
    }

    static async updateClient(id, data) {
        const updatedClient = await ClientRepository.update(id, data);
        if (!updatedClient) {
            const error = new Error('Client non trouvé');
            error.statusCode = 404;
            throw error;
        }
        return updatedClient;
    }

    static async deleteClient(id) {
        await ClientRepository.delete(id);
    }
}

module.exports = ClientService;
