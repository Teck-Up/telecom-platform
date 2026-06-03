require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');

const authRoutes         = require('./routes/auth');
const clientRoutes       = require('./routes/clients');
const invoiceRoutes      = require('./routes/invoices');
const paymentRoutes      = require('./routes/payments');
const recoveryRoutes     = require('./routes/recovery');
const dashboardRoutes    = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const userRoutes         = require('./routes/users');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth',          authRoutes);
app.use('/api/clients',       clientRoutes);
app.use('/api/invoices',      invoiceRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/recovery',      recoveryRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users',         userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Test Sequelize connection then start server
sequelize.authenticate()
  .then(() => {
    console.log('✅ Connexion MySQL via Sequelize établie');
    app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Impossible de se connecter à MySQL:', err);
    process.exit(1);
  });
