const AuthService = require('../services/auth.service');

const authController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Petite validation basique (tu pourrais aussi faire un LoginDTO)
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });
      }

      const result = await AuthService.login(email, password);
      res.json({ success: true, ...result });

    } catch (err) {
      // Si c'est une erreur métier (ex: 401 Identifiants invalides)
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  register: async (req, res) => {
    try {
      // Si tu as mis en place le middleware validateDto(CreateUserDTO) dans tes routes,
      // req.body est déjà validé. Sinon, on garde cette vérification de sécurité :
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Champs requis manquants' });
      }

      const userId = await AuthService.register({ name, email, password, role });
      res.status(201).json({ success: true, message: 'Utilisateur créé', id: userId });

    } catch (err) {
      // Si c'est une erreur métier (ex: 409 Email déjà utilisé)
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = authController;
