const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecoveryCase = sequelize.define('RecoveryCase', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    client_id: { type: DataTypes.INTEGER, allowNull: false },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    recovery_agent_id: { type: DataTypes.INTEGER },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'legal', 'closed'),
      defaultValue: 'open',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    overdue_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    penalty_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    overdue_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
    resolved_at: { type: DataTypes.DATE },
  }, {
    tableName: 'recovery_cases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return RecoveryCase;
};
