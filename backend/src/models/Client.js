const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    company_name: { type: DataTypes.STRING(255) },
    phone: { type: DataTypes.STRING(50) },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING(100) },
    postal_code: { type: DataTypes.STRING(20) },
    country: { type: DataTypes.STRING(100), defaultValue: 'France' },
    siret: { type: DataTypes.STRING(50) },
    contract_type: {
      type: DataTypes.ENUM('prepaid', 'postpaid', 'enterprise'),
      defaultValue: 'postpaid',
    },
    credit_limit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'terminated'),
      defaultValue: 'active',
    },
  }, {
    tableName: 'clients',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Client;
};
