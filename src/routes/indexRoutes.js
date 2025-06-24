const express = require('express');
const router = express.Router();
const accountsRoutes = require('./accountsRoutes');
const metricsRoutes = require('./metricsRoutes');
const emailsRoutes = require('./emailsRoutes');
const webhooksRoutes = require('./webhooksRoutes');
const leadStatsRoutes = require('./leadStatsRoutes');
const apiKeyAuth = require('../middleware/apiKeyMiddleware');
const adminRoutes = require('./adminRoutes');

// Rota raiz da API
router.get('/', (req, res) => {
  res.json({
    message: 'API do Dashboard de Email Marketing',
    version: '1.0.0',
    endpoints: {
      users: '/api/users/{userId}/accounts',
      metrics: '/api/users/{userId}/metrics',
      emails: '/api/users/{userId}/emails',
      webhooks: '/api/webhooks'
    }
  });
});

// Rotas de webhooks (não requerem autenticação)
router.use('/webhooks', webhooksRoutes);

// Aplicar middleware de autenticação para todas as rotas abaixo
router.use(apiKeyAuth);
// Rotas administrativas (com autenticação)
router.use('/admin', apiKeyAuth, adminRoutes);

// Rotas com userId como parte do caminho
router.use('/users/:userId/accounts', accountsRoutes);
router.use('/users/:userId/metrics', metricsRoutes);
router.use('/users/:userId/emails', emailsRoutes);
router.use('/users/:userId/lead-stats', leadStatsRoutes);

module.exports = router;
