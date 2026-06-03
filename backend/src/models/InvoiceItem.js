const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InvoiceItem = sequelize.define('InvoiceItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
    unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  }, {
    tableName: 'invoice_items',
    timestamps: false,
  });

  return InvoiceItem;
};
