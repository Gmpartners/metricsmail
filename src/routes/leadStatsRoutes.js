const express = require('express');
const router = express.Router();
const leadStatsController = require('../controllers/leadStatsController');

// Rota para obter estatísticas de leads
router.get('/', leadStatsController.getLeadStats);

// Rota para salvar estatísticas de leads para uma data específica
router.post('/:accountId/:date', leadStatsController.saveLeadStats);

// Rota para coletar e salvar estatísticas do dia anterior
router.post('/collect-yesterday', leadStatsController.collectYesterdayStats);

module.exports = router;
