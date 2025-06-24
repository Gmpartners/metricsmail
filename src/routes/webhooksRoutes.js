const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooksController');

// Rota para receber webhooks do Mautic
router.post('/:webhookId', webhooksController.processMauticWebhook);

module.exports = router;
