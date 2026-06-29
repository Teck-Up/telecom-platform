const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/user.repository');

class AuthService {
    static async login(email, password) {
        // 1. Vérifier si l'utilisateur existe et est actif
        const user = await UserRepository.findByEmail(email);
        if (!user || !user.is_active) {
            const error = new Error('Identifiants invalides');
            error.statusCode = 401;
            throw error;
        }

        // 2. Vérifier le mot de passe
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            const error = new Error('Identifiants invalides');
            error.statusCode = 401;
            throw error;
        }

        // 3. Générer le token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Retourner les données
        return {
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        };
    }

    static async register(userData) {
        // 1. Vérifier si l'email est déjà pris
        const exists = await UserRepository.findByEmail(userData.email);
        if (exists) {
            const error = new Error('Email déjà utilisé');
            error.statusCode = 409;
            throw error;
        }

        // 2. Hacher le mot de passe
        const hashed = await bcrypt.hash(userData.password, 10);

        // 3. Créer l'utilisateur
        const newUser = await UserRepository.create({
            name: userData.name,
            email: userData.email,
            password: hashed,
            role: userData.role || 'client'
        });

        return newUser.id;
    }
}

module.exports = AuthService;
