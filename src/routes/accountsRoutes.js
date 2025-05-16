const express = require('express');
const router = express.Router({ mergeParams: true });
const accountsController = require('../controllers/accountsController');
const responseUtils = require('../utils/responseUtil');

// Rota para comparar múltiplas contas (deve vir antes da rota de ID)
router.get('/compare', accountsController.compareAccounts);

// Rota para listar todas as contas
router.get('/', accountsController.listAccounts);

// Rota para obter detalhes de uma conta específica (deve vir por último)
router.get('/:accountId', accountsController.getAccountDetails);

module.exports = router;
