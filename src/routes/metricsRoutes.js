const express = require('express');
const router = express.Router({ mergeParams: true }); // importante para acessar userId
const metricsController = require('../controllers/metricsController');
const { getMetricsSummary } = require('../controllers/metricsSummaryController');
const { getDashboardMetrics } = require('../controllers/dashboardController');

// Rota raiz para obter resumo de métricas
router.get('/', getMetricsSummary);

// ✨ NOVA ROTA: Dashboard unificado (deve vir antes das rotas by-*)
router.get('/dashboard', getDashboardMetrics);

// Comparação de métricas (deve vir antes da rota by-*)
router.get('/compare', metricsController.compareMetrics);

// Rotas de métricas com userId implícito nos parâmetros da rota
router.get('/by-date', metricsController.getMetricsByDate);
router.get('/by-account', metricsController.getMetricsByAccount);
router.get('/by-email', metricsController.getMetricsByEmail);

// Rotas para eventos
router.get('/events/recent', metricsController.getRecentEvents);
router.get('/events', metricsController.getDetailedEvents);

module.exports = router;
