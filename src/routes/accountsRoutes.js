const express = require('express');
const router = express.Router({ mergeParams: true });
const accountsController = require('../controllers/accountsController');

// Rotas para buscar dados diretamente do Mautic
router.get('/:accountId/mautic/emails/search', accountsController.getMauticEmails);
router.get('/:accountId/mautic/emails/:emailId', accountsController.getMauticEmailDetails);
router.get('/:accountId/mautic/emails', accountsController.getMauticEmails);

// Rota para comparar múltiplas contas (deve vir antes da rota de ID)
router.get('/compare', accountsController.compareAccounts);

// Rota para listar todas as contas
router.get('/', accountsController.listAccounts);

// Rota para criar nova conta
router.post('/', accountsController.createAccount);

// Rota para editar conta existente
router.put('/:accountId', accountsController.updateAccount);

// Rota para deletar conta
router.delete('/:accountId', accountsController.deleteAccount);

// Rota para obter webhook de uma conta específica
router.get('/:accountId/webhook', accountsController.getAccountWebhook);

// Rota para obter detalhes de uma conta específica (deve vir por último)
router.get('/:accountId', accountsController.getAccountDetails);

module.exports = router;
