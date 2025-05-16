const express = require('express');
const router = express.Router({ mergeParams: true }); // importante para acessar userId
const metricsController = require('../controllers/metricsController');
const { getMetricsSummary } = require('../controllers/metricsSummaryController');
const { Event } = require('../models');
const responseUtils = require('../utils/responseUtil');

// Rota raiz para obter resumo de métricas
router.get('/', getMetricsSummary);

// Comparação de métricas (deve vir antes da rota by-*)
router.get('/compare', metricsController.compareMetrics);

// Rotas de métricas com userId implícito nos parâmetros da rota
router.get('/by-date', metricsController.getMetricsByDate);
router.get('/by-account', metricsController.getMetricsByAccount);
router.get('/by-campaign', metricsController.getMetricsByCampaign);
router.get('/by-email', metricsController.getMetricsByEmail);
router.get('/opens', metricsController.getOpenedEmails);
router.get('/last-send', metricsController.getLastSendDate);
router.get('/rates', metricsController.getRates);
router.get('/send-rate', metricsController.getSendRate);
router.get('/daily-sends', metricsController.getDailySends);
router.get('/daily-opens', metricsController.getDailyOpens);
router.get('/daily-clicks', metricsController.getDailyClicks);

// Rota adicional para obter eventos recentes com filtragem
router.get('/events', metricsController.getEvents);

module.exports = router;
