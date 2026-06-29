const DashboardService = require('../services/dashboard.service');

const dashboardController = {
  getStats: async (req, res, next) => {
    try {
      const data = await DashboardService.getStats();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  getCA: async (req, res, next) => {
    try {
      const data = await DashboardService.getCA(req.query.year);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
