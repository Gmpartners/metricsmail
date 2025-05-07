const { v4: uuidv4 } = require('uuid');
const { Account } = require('../models');
const responseUtils = require('../utils/responseUtil');

// Obter todas as contas do usuário
const getAllAccounts = async (req, res) => {
  try {
    // Extrair userId dos parâmetros da rota
    const { userId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const accounts = await Account.find({ userId })
      .select('-credentials.password -credentials.apiKey -credentials.apiSecret -webhookSecret')
      .sort({ createdAt: -1 });
    
    // Adicionar webhookUrl para contas Mautic
    const accountsWithWebhookUrl = accounts.map(account => {
      const acc = account.toObject();
      if (acc.provider === 'mautic' && acc.webhookId) {
        acc.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${acc.webhookId}`;
      }
      return acc;
    });
    
    return responseUtils.success(res, accountsWithWebhookUrl);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter uma conta específica
const getAccountById = async (req, res) => {
  try {
    const { userId, id } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: id, userId })
      .select('-credentials.password -credentials.apiKey -credentials.apiSecret -webhookSecret');
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    // Adicionar webhookUrl para contas Mautic
    const accountResponse = account.toObject();
    if (accountResponse.provider === 'mautic' && accountResponse.webhookId) {
      accountResponse.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${accountResponse.webhookId}`;
    }
    
    return responseUtils.success(res, accountResponse);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Criar uma nova conta
const createAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar os dados da requisição
    const { name, provider, url, username, password } = req.body;
    
    if (!name || !provider || !url || !username || !password) {
      return responseUtils.error(res, 'Todos os campos são obrigatórios');
    }
    
    // Inicializar o objeto da conta
    const accountData = {
      userId,
      name,
      provider,
      url,
      credentials: {
        username,
        password
      },
      status: 'inactive',
      isConnected: false
    };
    
    // Se for Mautic, gerar webhookId
    if (provider === 'mautic') {
      accountData.webhookId = uuidv4();
    }
    
    // Criar a conta
    const newAccount = new Account(accountData);
    await newAccount.save();
    
    // Remover dados sensíveis antes de retornar
    const accountResponse = newAccount.toObject();
    delete accountResponse.credentials.password;
    
    return responseUtils.success(res, accountResponse, 201);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Atualizar uma conta existente
const updateAccount = async (req, res) => {
  try {
    const { userId, id } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: id, userId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    // Campos permitidos para atualização
    const { name, url, username, password } = req.body;
    
    // Atualizar apenas campos fornecidos
    if (name) account.name = name;
    if (url) account.url = url;
    if (username) account.credentials.username = username;
    if (password) account.credentials.password = password;
    
    await account.save();
    
    // Remover dados sensíveis antes de retornar
    const accountResponse = account.toObject();
    delete accountResponse.credentials.password;
    delete accountResponse.credentials.apiKey;
    delete accountResponse.credentials.apiSecret;
    delete accountResponse.webhookSecret;
    
    return responseUtils.success(res, accountResponse);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Excluir uma conta
const deleteAccount = async (req, res) => {
  try {
    const { userId, id } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: id, userId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    await Account.deleteOne({ _id: id });
    
    return responseUtils.success(res, { message: 'Conta excluída com sucesso' });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Testar conexão com a conta
const testConnection = async (req, res) => {
  try {
    const { userId, id } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: id, userId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    // Testar conexão com o provedor
    const testResult = await account.testConnection();
    
    if (testResult.success) {
      account.isConnected = true;
      account.status = 'active';
      await account.save();
    } else {
      account.isConnected = false;
      account.status = 'error';
      await account.save();
    }
    
    return responseUtils.success(
      res, 
      { 
        success: testResult.success,
        message: testResult.message,
        accountId: account._id,
        status: account.status,
        isConnected: account.isConnected,
        webhook: testResult.webhook || null
      }
    );
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Buscar campanhas do Mautic
const getMauticCampaigns = async (req, res) => {
  try {
    const { userId, id } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: id, userId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    if (account.provider !== 'mautic') {
      return responseUtils.error(res, 'Esta função está disponível apenas para contas Mautic');
    }
    
    // Buscar campanhas do Mautic
    const campaignsResult = await account.getMauticCampaigns();
    
    if (campaignsResult.success) {
      return responseUtils.success(res, {
        campaigns: campaignsResult.campaigns,
        total: campaignsResult.total
      });
    } else {
      return responseUtils.error(res, campaignsResult.message);
    }
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Buscar emails do Mautic
const getMauticEmails = async (req, res) => {
  try {
    const { userId, id } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: id, userId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    if (account.provider !== 'mautic') {
      return responseUtils.error(res, 'Esta função está disponível apenas para contas Mautic');
    }
    
    // Buscar emails do Mautic
    const emailsResult = await account.getMauticEmails();
    
    if (emailsResult.success) {
      return responseUtils.success(res, {
        emails: emailsResult.emails,
        total: emailsResult.total
      });
    } else {
      return responseUtils.error(res, emailsResult.message);
    }
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  testConnection,
  getMauticCampaigns,
  getMauticEmails
};
