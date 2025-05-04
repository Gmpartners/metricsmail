const express = require('express');
const router = express.Router({ mergeParams: true }); // importante para acessar userId
const metricsController = require('../controllers/metricsController');
const { Event } = require('../models');
const responseUtils = require('../utils/responseUtil');

// Rotas de métricas com userId implícito nos parâmetros da rota
router.get('/by-date', metricsController.getMetricsByDate);
router.get('/by-account', metricsController.getMetricsByAccount);
router.get('/by-campaign', metricsController.getMetricsByCampaign);
router.get('/opens', metricsController.getOpenedEmails);
router.get('/last-send', metricsController.getLastSendDate);
router.get('/rates', metricsController.getRates);
router.get('/send-rate', metricsController.getSendRate);
router.get('/daily-sends', metricsController.getDailySends);
router.get('/daily-opens', metricsController.getDailyOpens);
router.get('/daily-clicks', metricsController.getDailyClicks);

// Rota adicional para obter eventos recentes
router.get('/events', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const events = await Event.find({ userId })
      .populate('account', 'name provider')
      .populate('campaign', 'name')
      .populate('email', 'subject')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));
    
    // Formatar os dados para o frontend
    const formattedEvents = events.map(event => ({
      _id: event._id,
      eventType: event.eventType,
      timestamp: event.timestamp,
      campaignName: event.campaign ? event.campaign.name : 'Desconhecido',
      contactEmail: event.contactEmail,
      emailSubject: event.email ? event.email.subject : 'Desconhecido'
    }));
    
    return responseUtils.success(res, formattedEvents);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
});

module.exports = router;