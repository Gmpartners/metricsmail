const { v4: uuidv4 } = require('uuid');
const { Account } = require('../models');
const responseUtils = require('../utils/responseUtil');
const axios = require('axios');
const https = require('https');

const getAllAccounts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const accounts = await Account.find({ userId })
      .select('-credentials.password -credentials.apiKey -credentials.apiSecret')
      .sort({ createdAt: -1 });
    
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

const getAccountById = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId })
      .select('-credentials.password -credentials.apiKey -credentials.apiSecret');
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
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

const getAccountWebhook = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const account = await Account.findOne({ _id: accountId, userId })
      .select('webhookId webhookUrl provider');
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    if (!account.webhookId) {
      account.webhookId = uuidv4();
      await account.save();
    }
    
    const webhookUrl = account.webhookUrl || `${process.env.BASE_URL}/api/webhooks/${account.webhookId}`;
    
    if (!account.webhookUrl) {
      account.webhookUrl = webhookUrl;
      await account.save();
    }
    
    return responseUtils.success(res, {
      webhookId: account.webhookId,
      webhookUrl: webhookUrl,
      provider: account.provider,
      instructions: account.provider === 'mautic' 
        ? 'Configure este webhook no seu painel Mautic em Configurações > Webhooks. Adicione os eventos: email_on_open, email_on_send, email_on_click, email_on_bounce, email_on_unsubscribe.' 
        : 'Configure este webhook no seu provedor de email marketing.'
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const testMauticConnection = async (url, username, password) => {
  try {
    let baseUrl = url;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    const apiUrl = `${baseUrl}/api/contacts?limit=1`;
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const axiosConfig = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };
    
    const response = await axios.get(apiUrl, axiosConfig);
    
    if (response.status === 200) {
      return { success: true, message: 'Conexão estabelecida com sucesso.' };
    } else {
      return { success: false, message: `Falha na conexão: Código de status ${response.status}` };
    }
  } catch (error) {
    console.error('Erro no teste de conexão:', error);
    let errorMessage = 'Falha ao conectar com o provedor';
    
    if (error.response) {
      errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Falha na autenticação'}`;
    } else if (error.request) {
      errorMessage = 'Falha na conexão: servidor não responde';
    } else {
      errorMessage = error.message || 'Erro desconhecido na conexão';
    }
    
    return { success: false, message: errorMessage };
  }
};

const createAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const { name, provider, url, username, password } = req.body;
    
    if (!name || !provider || !url || !username || !password) {
      return responseUtils.error(res, 'Todos os campos são obrigatórios');
    }
    
    if (provider === 'mautic') {
      const connectionResult = await testMauticConnection(url, username, password);
      
      if (!connectionResult.success) {
        return responseUtils.error(res, `Não foi possível conectar. Verifique suas credenciais. ${connectionResult.message}`);
      }
      
      const webhookId = uuidv4();
      const webhookUrl = `${process.env.BASE_URL}/api/webhooks/${webhookId}`;
      
      const accountData = {
        userId,
        name,
        provider,
        url,
        credentials: {
          username,
          password
        },
        webhookId,
        webhookUrl,
        status: 'active',
        isConnected: true
      };
      
      const newAccount = new Account(accountData);
      await newAccount.save();
      
      const accountResponse = newAccount.toObject();
      delete accountResponse.credentials.password;
      
      return responseUtils.success(res, {
        ...accountResponse,
        message: 'Conta criada com sucesso. Conexão estabelecida.',
        webhookUrl
      }, 201);
    } else {
      return responseUtils.error(res, 'Provedor não suportado atualmente');
    }
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

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
    
    const { name, url, username, password } = req.body;
    
    if ((url && url !== account.url) || 
        (username && username !== account.credentials.username) || 
        password) {
      
      const testUrl = url || account.url;
      const testUsername = username || account.credentials.username;
      const testPassword = password || account.credentials.password;
      
      const connectionResult = await testMauticConnection(testUrl, testUsername, testPassword);
      
      if (!connectionResult.success) {
        return responseUtils.error(res, `Não foi possível conectar com as novas credenciais. ${connectionResult.message}`);
      }
      
      if (url) account.url = url;
      if (username) account.credentials.username = username;
      if (password) account.credentials.password = password;
      account.status = 'active';
      account.isConnected = true;
    }
    
    if (name) account.name = name;
    
    await account.save();
    
    const accountResponse = account.toObject();
    delete accountResponse.credentials.password;
    delete accountResponse.credentials.apiKey;
    delete accountResponse.credentials.apiSecret;
    
    return responseUtils.success(res, {
      ...accountResponse,
      message: 'Conta atualizada com sucesso'
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

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
  getAccountWebhook,
  createAccount,
  updateAccount,
  deleteAccount,
  getMauticCampaigns,
  getMauticEmails
};
