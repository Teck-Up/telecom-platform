const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    client_id: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    payment_date: { type: DataTypes.DATE, allowNull: false },
    payment_method: {
      type: DataTypes.ENUM('bank_transfer', 'credit_card', 'check', 'cash', 'direct_debit'),
      allowNull: false,
    },
    reference: { type: DataTypes.STRING(255) },
    notes: { type: DataTypes.TEXT },
    recorded_by: { type: DataTypes.INTEGER },
    status: {
      type: DataTypes.ENUM('success', 'pending', 'failed'),
      defaultValue: 'success',
    },
    bank_name: { type: DataTypes.STRING(100) },
    bank_agency: { type: DataTypes.STRING(255) },
    issuer_name: { type: DataTypes.STRING(255) },
    account_rib: { type: DataTypes.STRING(30) },
    maturity_date: { type: DataTypes.DATEONLY },
  }, {
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return Payment;
};
