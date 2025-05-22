const { Account, Email, Event } = require('../models');
const responseUtils = require('../utils/responseUtil');

// Listar contas com suporte a filtros
const listAccounts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir filtro
    const filter = { userId };
    
    // Adicionar filtro de contas específicas se fornecido
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        filter._id = { $in: accountIdArray };
      }
    }
    
    // Buscar contas
    const accounts = await Account.find(filter)
      .sort({ name: 1 });
    
    // Contar emails por conta para estatísticas
    const accountsWithStats = await Promise.all(accounts.map(async (account) => {
      const accountObj = account.toObject();
      
      // Contar emails nesta conta
      const emailCount = await Email.countDocuments({ 
        userId,
        account: account._id 
      });
      
      // Contar eventos por tipo
      const sentCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'send' 
      });
      
      const openCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'open' 
      });
      
      const clickCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'click' 
      });
      
      // Incluir estatísticas
      accountObj.stats = {
        emailCount,
        sentCount,
        openCount,
        clickCount,
        openRate: sentCount > 0 ? (openCount / sentCount) * 100 : 0,
        clickRate: sentCount > 0 ? (clickCount / sentCount) * 100 : 0
      };
      
      return accountObj;
    }));
    
    return responseUtils.success(res, accountsWithStats);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter detalhes de uma conta específica
const getAccountDetails = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
    // Buscar conta
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    // Adicionar estatísticas detalhadas
    const accountObj = account.toObject();
    
    // Contar emails nesta conta
    const emailCount = await Email.countDocuments({ 
      userId,
      account: account._id 
    });
    
    // Contar eventos por tipo
    const sentCount = await Event.countDocuments({ 
      userId,
      account: account._id,
      eventType: 'send' 
    });
    
    const openCount = await Event.countDocuments({ 
      userId,
      account: account._id,
      eventType: 'open' 
    });
    
    const clickCount = await Event.countDocuments({ 
      userId,
      account: account._id,
      eventType: 'click' 
    });
    
    const bounceCount = await Event.countDocuments({ 
      userId,
      account: account._id,
      eventType: 'bounce' 
    });
    
    const unsubscribeCount = await Event.countDocuments({ 
      userId,
      account: account._id,
      eventType: 'unsubscribe' 
    });
    
    // Incluir estatísticas
    accountObj.stats = {
      emailCount,
      sentCount,
      openCount,
      clickCount,
      bounceCount,
      unsubscribeCount,
      openRate: sentCount > 0 ? (openCount / sentCount) * 100 : 0,
      clickRate: sentCount > 0 ? (clickCount / sentCount) * 100 : 0,
      bounceRate: sentCount > 0 ? (bounceCount / sentCount) * 100 : 0,
      unsubscribeRate: sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0
    };
    
    // Buscar emails relacionados (os 10 mais recentes)
    const recentEmails = await Email.find({
      userId,
      account: account._id
    })
    .select('subject fromName fromEmail sentDate metrics')
    .sort({ sentDate: -1 })
    .limit(10);
    
    accountObj.recentEmails = recentEmails;
    
    return responseUtils.success(res, accountObj);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Comparar múltiplas contas
const compareAccounts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    if (!accountIds) {
      return responseUtils.error(res, 'É necessário fornecer IDs de contas para comparação');
    }
    
    // Processar IDs de contas
    const accountIdArray = accountIds.split(',');
    
    if (accountIdArray.length < 1) {
      return responseUtils.error(res, 'É necessário fornecer pelo menos uma conta para comparação');
    }
    
    // Buscar contas
    const accounts = await Account.find({
      _id: { $in: accountIdArray },
      userId
    }).sort({ name: 1 });
    
    if (accounts.length === 0) {
      return responseUtils.notFound(res, 'Nenhuma conta encontrada com os IDs fornecidos');
    }
    
    // Preparar contas com estatísticas para comparação
    const accountsForComparison = await Promise.all(accounts.map(async (account) => {
      const accountObj = account.toObject();
      
      // Contar emails nesta conta
      const emailCount = await Email.countDocuments({ 
        userId,
        account: account._id 
      });
      
      // Contar eventos por tipo
      const sentCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'send' 
      });
      
      const openCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'open' 
      });
      
      const clickCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'click' 
      });
      
      const bounceCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'bounce' 
      });
      
      const unsubscribeCount = await Event.countDocuments({ 
        userId,
        account: account._id,
        eventType: 'unsubscribe' 
      });
      
      // Incluir estatísticas
      accountObj.stats = {
        emailCount,
        sentCount,
        openCount,
        clickCount,
        bounceCount,
        unsubscribeCount,
        openRate: sentCount > 0 ? (openCount / sentCount) * 100 : 0,
        clickRate: sentCount > 0 ? (clickCount / sentCount) * 100 : 0,
        bounceRate: sentCount > 0 ? (bounceCount / sentCount) * 100 : 0,
        unsubscribeRate: sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0
      };
      
      return accountObj;
    }));
    
    // Calcular totais e médias para comparação
    const totals = {
      emailCount: 0,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0
    };
    
    // Calcular totais
    accountsForComparison.forEach(account => {
      totals.emailCount += account.stats.emailCount;
      totals.sentCount += account.stats.sentCount;
      totals.openCount += account.stats.openCount;
      totals.clickCount += account.stats.clickCount;
      totals.bounceCount += account.stats.bounceCount;
      totals.unsubscribeCount += account.stats.unsubscribeCount;
    });
    
    // Calcular médias
    const averages = {
      openRate: totals.sentCount > 0 ? (totals.openCount / totals.sentCount) * 100 : 0,
      clickRate: totals.sentCount > 0 ? (totals.clickCount / totals.sentCount) * 100 : 0,
      bounceRate: totals.sentCount > 0 ? (totals.bounceCount / totals.sentCount) * 100 : 0,
      unsubscribeRate: totals.sentCount > 0 ? (totals.unsubscribeCount / totals.sentCount) * 100 : 0
    };
    
    return responseUtils.success(res, {
      accounts: accountsForComparison,
      totals,
      averages
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  listAccounts,
  getAccountDetails,
  compareAccounts
};

// Criar nova conta
const createAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, provider, url, username, password } = req.body;
    
    if (!userId || !name || !provider || !url || !username || !password) {
      return responseUtils.error(res, 'Todos os campos são obrigatórios');
    }
    
    const { v4: uuidv4 } = require('uuid');
    const webhookId = uuidv4();
    const baseUrl = process.env.BASE_URL || 'https://metrics.devoltaaojogo.com';
    
    // Criar nova conta
    const newAccount = await Account.create({
      userId,
      name,
      provider,
      url,
      credentials: {
        username,
        password
      },
      webhookUrl: `${baseUrl}/api/webhooks/${webhookId}`,
      status: 'active',
      settings: {
        trackOpens: true,
        trackClicks: true
      }
    });
    
    return responseUtils.success(res, newAccount);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter webhook de uma conta
const getAccountWebhook = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
    // Buscar conta
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    const webhookData = {
      webhookId: account.webhookUrl ? account.webhookUrl.split('/').pop() : null,
      webhookUrl: account.webhookUrl,
      provider: account.provider,
      instructions: 'Configure este webhook no seu painel Mautic em Configurações > Webhooks. Adicione os eventos: email_on_open, email_on_send, email_on_click, email_on_bounce, email_on_unsubscribe.'
    };
    
    return responseUtils.success(res, webhookData);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  listAccounts,
  getAccountDetails,
  compareAccounts,
  createAccount,
  getAccountWebhook
};
