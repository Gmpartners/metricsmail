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
    
    // Preparar resposta com webhook URL se for Mautic
    const accountResponse = newAccount.toObject();
    delete accountResponse.credentials.password;
    
    // Adicionar webhookUrl para contas Mautic
    if (provider === 'mautic' && accountResponse.webhookId) {
      accountResponse.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${accountResponse.webhookId}`;
    }
    
    return responseUtils.success(
      res, 
      accountResponse, 
      'Conta criada com sucesso', 
      201
    );
  } catch (err) {
    if (err.code === 11000) {
      return responseUtils.error(res, 'Já existe uma conta com estes dados');
    }
    
    return responseUtils.serverError(res, err);
  }
};

// Atualizar uma conta existente
const updateAccount = async (req, res) => {
  try {
    const { userId, id } = req.params;
    const { name, url, username, password } = req.body;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Encontrar a conta (garantindo que pertence ao usuário)
    const account = await Account.findOne({ _id: id, userId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    // Atualizar os campos
    if (name) account.name = name;
    if (url) account.url = url;
    
    // Atualizar credenciais se fornecidas
    if (username) account.credentials.username = username;
    if (password) account.credentials.password = password;
    
    await account.save();
    
    // Não retorna dados sensíveis
    const accountResponse = account.toObject();
    delete accountResponse.credentials.password;
    delete accountResponse.credentials.apiKey;
    delete accountResponse.credentials.apiSecret;
    delete accountResponse.webhookSecret;
    
    // Adicionar webhookUrl para contas Mautic
    if (accountResponse.provider === 'mautic' && accountResponse.webhookId) {
      accountResponse.webhookUrl = `${process.env.BASE_URL}/api/webhooks/${accountResponse.webhookId}`;
    }
    
    return responseUtils.success(
      res, 
      accountResponse, 
      'Conta atualizada com sucesso'
    );
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
    
    await Account.deleteOne({ _id: id, userId });
    
    return responseUtils.success(
      res, 
      { id }, 
      'Conta excluída com sucesso'
    );
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
    
    // Aqui, em uma implementação real, testaríamos a conexão com o provedor
    // Por enquanto, vamos apenas simular
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
        isConnected: account.isConnected
      }
    );
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
  testConnection
};
