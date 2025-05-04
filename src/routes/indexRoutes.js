const express = require('express');
const router = express.Router();
const accountsRoutes = require('./accountsRoutes');
const metricsRoutes = require('./metricsRoutes');
const emailsRoutes = require('./emailsRoutes');
const apiKeyAuth = require('../middleware/apiKeyMiddleware');

// Rota raiz da API
router.get('/', (req, res) => {
  res.json({
    message: 'API do Dashboard de Email Marketing',
    version: '1.0.0',
    endpoints: {
      users: '/api/users/{userId}/accounts',
      metrics: '/api/users/{userId}/metrics',
      emails: '/api/users/{userId}/emails'
    }
  });
});

// Aplicar middleware de autenticação para todas as rotas abaixo
router.use(apiKeyAuth);

// Rotas com userId como parte do caminho
router.use('/users/:userId/accounts', accountsRoutes);
router.use('/users/:userId/metrics', metricsRoutes);
router.use('/users/:userId/emails', emailsRoutes);

module.exports = router;