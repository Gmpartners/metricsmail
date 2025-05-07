const express = require('express');
const router = express.Router({ mergeParams: true }); // importante para acessar userId
const accountsController = require('../controllers/accountsController');

// Removida a autenticação para simplificar o desenvolvimento inicial
router.get('/', accountsController.getAllAccounts);
router.get('/:id', accountsController.getAccountById);
router.post('/', accountsController.createAccount);
router.put('/:id', accountsController.updateAccount);
router.delete('/:id', accountsController.deleteAccount);
router.post('/:id/test-connection', accountsController.testConnection);

// Novos endpoints para Mautic
router.get('/:id/campaigns', accountsController.getMauticCampaigns);
router.get('/:id/emails', accountsController.getMauticEmails);

module.exports = router;
