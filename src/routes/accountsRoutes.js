const express = require('express');
const router = express.Router({ mergeParams: true }); // importante para acessar userId
const accountsController = require('../controllers/accountsController');

// Rotas padrão para gerenciamento de contas
router.get('/', accountsController.getAllAccounts);
router.get('/:accountId', accountsController.getAccountById);
router.post('/', accountsController.createAccount);
router.put('/:accountId', accountsController.updateAccount);
router.delete('/:accountId', accountsController.deleteAccount);

// Endpoints específicos para Mautic
router.get('/:accountId/campaigns', accountsController.getMauticCampaigns);
router.get('/:accountId/emails', accountsController.getMauticEmails);

module.exports = router;
