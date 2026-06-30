const axios = require('axios');

// Configuration de l'URL de base du service Python
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/ai';

class AiService {
    /**
     * Envoie une question au chatbot intelligent
     */
    async getChatResponse(query, contextData = {} ) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
                query,
                context_data: contextData
            });
            return response.data;
        } catch (error) {
            console.error("Erreur AiService (Chat):", error.message);
            throw new Error("Impossible de contacter le service AI.");
        }
    }

    /**
     * Récupère les prédictions de revenus
     */
    async getRevenuePredictions(periods = 30, granularity = 'day') {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/predict`, {
                periods,
                granularity
            });
            return response.data;
        } catch (error) {
            console.error("Erreur AiService (Predict):", error.message);
            throw new Error("Erreur lors de la génération des prédictions.");
        }
    }

    /**
     * Récupère les statistiques globales du dashboard
     */
    async getDashboardSummary() {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/dashboard/summary`);
            return response.data;
        } catch (error) {
            console.error("Erreur AiService (Summary):", error.message);
            throw new Error("Erreur lors de la récupération du résumé.");
        }
    }

    /**
     * Récupère l'historique des revenus (pour les graphiques)
     */
    async getRevenueHistory(granularity = 'day', startDate = null, endDate = null) {
        try {
            const params = { granularity, start_date: startDate, end_date: endDate };
            const response = await axios.get(`${AI_SERVICE_URL}/dashboard/revenue-history`, { params });
            return response.data;
        } catch (error) {
            console.error("Erreur AiService (History):", error.message);
            throw new Error("Erreur lors de la récupération de l'historique.");
        }
    }

    /**
     * Ré-entraîne l'IA sur les dernières données
     */
    async retrainPredictionModel() {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/train`);
            return response.data;
        } catch (error) {
            console.error("Erreur AiService (RecalculerIA):", error.message);
            throw new Error("Erreur lors de la suppression de la memoire.");
        }
    }

    async clearChatMemory() {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/chat/clear`);
            return response.data;
        } catch (error) {
            console.error("Erreur AiService (Réinitialiser la mémoire du chatbot):", error.message);
            throw new Error("Erreur lors de la suppression de la memoire.");
        }
    }

    async get_invoice_distribution(start_date, end_date) {
        try {
            const params = {  start_date: start_date, end_date: end_date };
            const response = await axios.get(`${AI_SERVICE_URL}/dashboard/invoice-distribution`,{ params });
            return response.data;
        } catch (error) {
            console.error("Erreur AiService (Invoice Distribution):", error.message);
            throw new Error("Erreur lors de la récupération de la répartition des factures.");
        }
    }

}

module.exports = new AiService();
