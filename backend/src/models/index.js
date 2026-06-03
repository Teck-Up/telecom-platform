const { Sequelize } = require('sequelize');

// ─── Connexion ────────────────────────────────────────────────────────────────
const sequelize = new Sequelize(
  process.env.DB_NAME || 'telecom_platform',
  process.env.DB_USER || 'telecom_user',
  process.env.DB_PASSWORD || 'telecom_pass',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // Mettre à console.log pour voir les requêtes SQL générées
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// ─── Import des modèles ───────────────────────────────────────────────────────
const User         = require('./User')(sequelize);
const Client       = require('./Client')(sequelize);
const Invoice      = require('./Invoice')(sequelize);
const InvoiceItem  = require('./InvoiceItem')(sequelize);
const Payment      = require('./Payment')(sequelize);
const RecoveryCase = require('./RecoveryCase')(sequelize);
const Reminder     = require('./Reminder')(sequelize);
const Notification = require('./Notification')(sequelize);

// ─── Associations ─────────────────────────────────────────────────────────────

// User <-> Client (1 user = 1 client)
User.hasOne(Client, { foreignKey: 'user_id', as: 'client' });
Client.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Client -> Invoices
Client.hasMany(Invoice, { foreignKey: 'client_id', as: 'invoices' });
Invoice.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// User (billing agent) -> Invoices
User.hasMany(Invoice, { foreignKey: 'billing_agent_id', as: 'billedInvoices' });
Invoice.belongsTo(User, { foreignKey: 'billing_agent_id', as: 'billingAgent' });

// Invoice -> InvoiceItems
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// Invoice -> Payments
Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// Client -> Payments
Client.hasMany(Payment, { foreignKey: 'client_id', as: 'payments' });
Payment.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// User (recorded_by) -> Payments
User.hasMany(Payment, { foreignKey: 'recorded_by', as: 'recordedPayments' });
Payment.belongsTo(User, { foreignKey: 'recorded_by', as: 'recordedBy' });

// Client -> RecoveryCases
Client.hasMany(RecoveryCase, { foreignKey: 'client_id', as: 'recoveryCases' });
RecoveryCase.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Invoice -> RecoveryCases
Invoice.hasMany(RecoveryCase, { foreignKey: 'invoice_id', as: 'recoveryCases' });
RecoveryCase.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// User (recovery agent) -> RecoveryCases
User.hasMany(RecoveryCase, { foreignKey: 'recovery_agent_id', as: 'assignedCases' });
RecoveryCase.belongsTo(User, { foreignKey: 'recovery_agent_id', as: 'agent' });

// RecoveryCase -> Reminders
RecoveryCase.hasMany(Reminder, { foreignKey: 'recovery_case_id', as: 'reminders' });
Reminder.belongsTo(RecoveryCase, { foreignKey: 'recovery_case_id', as: 'recoveryCase' });

// User -> Notifications
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  User,
  Client,
  Invoice,
  InvoiceItem,
  Payment,
  RecoveryCase,
  Reminder,
  Notification,
};
