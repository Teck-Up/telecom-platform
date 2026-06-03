const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Invoice = sequelize.define('Invoice', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoice_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    client_id: { type: DataTypes.INTEGER, allowNull: false },
    billing_agent_id: { type: DataTypes.INTEGER },
    amount_ht: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    tva_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 20.00 },
    amount_ttc: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    amount_paid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    issue_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'),
      defaultValue: 'draft',
    },
    description: { type: DataTypes.TEXT },
    pdf_path: { type: DataTypes.STRING(500) },
  }, {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Invoice;
};
