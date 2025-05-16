const express = require('express');
const router = express.Router({ mergeParams: true });
const accountsController = require('../controllers/accountsController');
const responseUtils = require('../utils/responseUtil');

// Rota para listar todas as contas
router.get('/', accountsController.listAccounts);

// Rota para obter detalhes de uma conta específica
router.get('/:accountId', accountsController.getAccountDetails);

// Rota para comparar múltiplas contas
router.get('/compare', accountsController.compareAccounts);

module.exports = router;
