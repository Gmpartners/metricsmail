const express = require('express');
const router = express.Router({ mergeParams: true });
const emailController = require('../controllers/emailController');
const responseUtils = require('../utils/responseUtil');

// Rota para listar todos os emails com suporte a múltiplas contas
router.get('/', emailController.listEmails);

// Rota para listar emails agrupados por conta
router.get('/by-account', emailController.listEmailsByAccount);

// Rota para comparar múltiplos emails
router.get('/compare', emailController.compareEmails);

// Rota para obter detalhes de um email específico
router.get('/:emailId', emailController.getEmailDetails);

module.exports = router;
