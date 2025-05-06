const express = require('express');
const router = express.Router();
const accountsRoutes = require('./accountsRoutes');
const metricsRoutes = require('./metricsRoutes');
const emailsRoutes = require('./emailsRoutes');
const webhooksRoutes = require('./webhooksRoutes'); // Nova importação
const apiKeyAuth = require('../middleware/apiKeyMiddleware');

// Rota raiz da API
router.get('/', (req, res) => {
  res.json({
    message: 'API do Dashboard de Email Marketing',
    version: '1.0.0',
    endpoints: {
      users: '/api/users/{userId}/accounts',
      metrics: '/api/users/{userId}/metrics',
      emails: '/api/users/{userId}/emails',
      webhooks: '/api/webhooks/{webhookId}' // Adicionar endpoint de webhooks
    }
  });
});

// Rota de webhooks (sem autenticação de API key)
// Nota: Os webhooks não usam autenticação por API key para permitir chamadas externas
router.use('/webhooks', webhooksRoutes);

// Aplicar middleware de autenticação para todas as rotas abaixo
router.use(apiKeyAuth);

// Rotas com userId como parte do caminho
router.use('/users/:userId/accounts', accountsRoutes);
router.use('/users/:userId/metrics', metricsRoutes);
router.use('/users/:userId/emails', emailsRoutes);

module.exports = router;
