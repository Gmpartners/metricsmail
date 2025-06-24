const express = require('express');
const router = express.Router();
const leadStatsController = require('../controllers/leadStatsController');

// Rota administrativa para coletar dados de leads de todas as contas
router.post('/lead-stats/collect-all', leadStatsController.collectYesterdayStats);

module.exports = router;
