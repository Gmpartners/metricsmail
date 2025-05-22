const express = require('express');
const router = express.Router({ mergeParams: true });
const emailController = require('../controllers/emailController');

// Rota para busca com sugestões (autocomplete)
router.get('/search/suggestions', emailController.searchEmailsWithSuggestions);

// Rota para listar emails agrupados por conta (deve vir antes da rota de ID)
router.get('/by-account', emailController.listEmailsByAccount);

// Rota para comparar múltiplos emails (deve vir antes da rota de ID)
router.get('/compare', emailController.compareEmails);

// Rota para listar todos os emails com suporte a múltiplas contas
router.get('/', emailController.listEmails);

// Rota para obter detalhes de um email específico (deve vir por último)
router.get('/:emailId', emailController.getEmailDetails);

module.exports = router;
