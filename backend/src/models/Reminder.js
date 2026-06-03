const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reminder = sequelize.define('Reminder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recovery_case_id: { type: DataTypes.INTEGER, allowNull: false },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    client_id: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM('email', 'sms', 'phone', 'legal_notice'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending',
    },
    sent_at: { type: DataTypes.DATE },
    response: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER },
  }, {
    tableName: 'reminders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return Reminder;
};
