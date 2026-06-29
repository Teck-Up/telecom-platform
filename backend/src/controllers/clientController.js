const ClientService = require('../services/client.service');

const clientController = {
  getAll: async (req, res) => {
    try {
      const result = await ClientService.getAllClients(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('getAll clients error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  getOne: async (req, res) => {
    try {
      const client = await ClientService.getClientById(req.params.id);
      res.json({ success: true, data: client });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      console.error('getOne client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  create: async (req, res) => {
    try {
      // On sépare les données User et Client pour le Service
      const userData = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
      };

      const clientData = {
        company_name: req.body.company_name,
        phone: req.body.phone,
        address: req.body.address,
        city: req.body.city,
        postal_code: req.body.postal_code,
        country: req.body.country,
        contract_type: req.body.contract_type,
        credit_limit: req.body.credit_limit
      };

      const clientId = await ClientService.createClient(userData, clientData);
      res.status(201).json({ success: true, id: clientId, message: 'Client créé' });

    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      console.error('create client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  update: async (req, res) => {
    try {
      // Idéalement, req.body est déjà filtré par ton UpdateClientDTO
      await ClientService.updateClient(req.params.id, req.body);
      res.json({ success: true, message: 'Client mis à jour' });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      console.error('update client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },

  remove: async (req, res) => {
    try {
      await ClientService.deleteClient(req.params.id);
      res.json({ success: true, message: 'Client supprimé' });
    } catch (err) {
      console.error('delete client error:', err);
      res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  },
};

module.exports = clientController;
