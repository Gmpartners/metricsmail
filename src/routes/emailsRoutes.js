const express = require('express');
const router = express.Router({ mergeParams: true }); // importante para acessar userId
const { Email } = require('../models');
const responseUtils = require('../utils/responseUtil');

// Obter todos os emails do usuário
router.get('/', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const emails = await Email.find({ userId })
      .populate('account', 'name provider')
      .populate('campaign', 'name')
      .sort({ createdAt: -1 });
    
    return responseUtils.success(res, emails);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
});

// Obter um email específico
router.get('/:id', async (req, res) => {
  try {
    const { userId, id } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const email = await Email.findOne({ _id: id, userId })
      .populate('account', 'name provider')
      .populate('campaign', 'name');
    
    if (!email) {
      return responseUtils.notFound(res, 'Email não encontrado');
    }
    
    return responseUtils.success(res, email);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
});

module.exports = router;
