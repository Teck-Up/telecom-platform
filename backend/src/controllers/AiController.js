const AiService = require('../services/AiService');

class AiController {
    async chat(req, res) {
        try {
            const { query, context_data } = req.body;
            const response = await AiService.getChatResponse(query, context_data);
            res.json(response);
        } catch (error) {
            console.error('Erreur dans AiController.chat:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async predict(req, res) {
        try {
            const { periods, granularity } = req.body;
            const predictions = await AiService.getRevenuePredictions(periods, granularity);
            res.json(predictions);
        } catch (error) {
            console.error('Erreur dans AiController.predict:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async getDashboardSummary(req, res) {
        try {
            const summary = await AiService.getDashboardSummary();
            res.json(summary);
        } catch (error) {
            console.error('Erreur dans AiController.getDashboardSummary:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async getRevenueHistory(req, res) {
        try {
            const { granularity, start_date, end_date } = req.query;
            const history = await AiService.getRevenueHistory(granularity, start_date, end_date);
            res.json(history);
        } catch (error) {
            console.error('Erreur dans AiController.getRevenueHistory:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Nouvelle méthode pour effacer la mémoire du chatbot
    async clearChatMemory(req, res) {
        try {
            const result = await AiService.clearChatMemory();
            res.json(result);
        } catch (error) {
            console.error('Erreur dans AiController.clearChatMemory:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Nouvelle méthode pour ré-entraîner le modèle de prédiction
    async retrainPredictionModel(req, res) {
        try {
            const result = await AiService.retrainPredictionModel();
            res.json(result);
        } catch (error) {
            console.error('Erreur dans AiController.retrainPredictionModel:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async get_invoice_distribution(req, res) {
        try {
            const {start_date, end_date} = req.query;
            const result = await AiService.get_invoice_distribution(start_date, end_date);
            res.json(result);
        } catch (error) {
            console.error('Erreur dans AiController.get_invoice_distribution:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AiController();
