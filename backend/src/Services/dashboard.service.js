const DashboardRepository = require('../repositories/dashboard.repository');

class DashboardService {
    static async getStats() {
        // Exécution de toutes les requêtes en parallèle pour optimiser les performances
        const [counts, caResult, monthlyCA, statusDist, topUnpaid] = await Promise.all([
            DashboardRepository.getCounts(),
            DashboardRepository.getGlobalCA(),
            DashboardRepository.getMonthlyCA(),
            DashboardRepository.getStatusDistribution(),
            DashboardRepository.getTopUnpaidClients()
        ]);

        const totals = {
            total_clients:  counts.totalClients,
            total_invoices: counts.totalInvoices,
            overdue_count:  counts.overdueCount,
            paid_count:     counts.paidCount,
            recovery_cases: counts.recoveryCases,
            total_ca:       caResult?.total_ca || 0,
            total_paid:     caResult?.total_paid || 0,
            total_unpaid:   caResult?.total_unpaid || 0,
        };

        return { totals, monthlyCA, statusDist, topUnpaid };
    }

    static async getCA(year) {
        const targetYear = year || new Date().getFullYear();
        return await DashboardRepository.getCAByYear(targetYear);
    }
}

module.exports = DashboardService;
