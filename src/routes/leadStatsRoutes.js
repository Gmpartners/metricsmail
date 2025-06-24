const express = require('express');
const router = express.Router({ mergeParams: true });
const leadStatsController = require('../controllers/leadStatsController');

// Rota para obter estatísticas de leads
router.get('/', leadStatsController.getLeadStats);

// Rota para salvar estatísticas de leads para uma conta e data específicas
router.post('/:accountId/:date', leadStatsController.saveLeadStats);

// Rota para coletar e salvar estatísticas do dia anterior (para todas as contas do usuário)
router.post('/collect-yesterday', leadStatsController.collectYesterdayStats);

module.exports = router;
