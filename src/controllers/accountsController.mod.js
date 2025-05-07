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
        if (!acc.webhookUrl) {
          acc.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${acc.webhookId}`;
        }
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
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId })
      .select('-credentials.password -credentials.apiKey -credentials.apiSecret -webhookSecret');
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    // Adicionar webhookUrl para contas Mautic
    const accountResponse = account.toObject();
    if (accountResponse.provider === 'mautic' && accountResponse.webhookId) {
      if (!accountResponse.webhookUrl) {
        accountResponse.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${accountResponse.webhookId}`;
      }
    }
    
    return responseUtils.success(res, accountResponse);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Criar uma nova conta e testar conexão automaticamente
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
      accountData.webhookSecret = uuidv4();
      accountData.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${accountData.webhookId}`;
    }
    
    // Criar a conta
    const newAccount = new Account(accountData);
    await newAccount.save();
    
    // MODIFICAÇÃO: Testar a conexão automaticamente após criar a conta
    let testResult = { success: false, message: 'Teste de conexão não realizado' };
    let isConnected = false;
    let status = 'inactive';
    
    try {
      // Chamar o método de teste de conexão no modelo Account
      testResult = await newAccount.testConnection();
      
      // Atualizar o status da conta com base no resultado do teste
      if (testResult.success) {
        isConnected = true;
        status = 'active';
      } else {
        isConnected = false;
        status = 'error';
      }
      
      // Atualizar a conta no banco de dados
      newAccount.isConnected = isConnected;
      newAccount.status = status;
      await newAccount.save();
    } catch (testError) {
      console.error('Erro ao testar conexão:', testError);
      testResult = { 
        success: false, 
        message: testError.message || 'Erro ao testar conexão com o provedor'
      };
    }
    
    // Preparar a resposta com os dados da conta e o resultado do teste
    const accountResponse = newAccount.toObject();
    delete accountResponse.credentials.password;
    
    const response = {
      ...accountResponse,
      testResult,
      connectionTested: true
    };
    
    return responseUtils.success(res, response, 201);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Atualizar uma conta existente
const updateAccount = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId });
    
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
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    await Account.deleteOne({ _id: accountId });
    
    return responseUtils.success(res, { message: 'Conta excluída com sucesso' });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Testar conexão com a conta (mantido para compatibilidade)
const testConnection = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId });
    
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
    
    // Preparar resposta
    const response = {
      success: testResult.success,
      message: testResult.message,
      accountId: account._id,
      status: account.status,
      isConnected: account.isConnected
    };
    
    // Adicionar URL do webhook se estiver disponível
    if (account.webhookUrl) {
      response.webhookUrl = account.webhookUrl;
    } else if (account.webhookId) {
      response.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${account.webhookId}`;
    }
    
    return responseUtils.success(res, response);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Buscar campanhas do Mautic
const getMauticCampaigns = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId });
    
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
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId });
    
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
