const { v4: uuidv4 } = require('uuid');
const { Account } = require('../models');
const responseUtils = require('../utils/responseUtil');
const axios = require('axios');
const https = require('https');

// Obter todas as contas do usuário
const getAllAccounts = async (req, res) => {
  try {
    // Extrair userId dos parâmetros da rota
    const { userId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const accounts = await Account.find({ userId })
      .select('-credentials.password -credentials.apiKey -credentials.apiSecret')
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
      .select('-credentials.password -credentials.apiKey -credentials.apiSecret');
    
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

// Testar conexão com o Mautic
const testMauticConnection = async (url, username, password) => {
  try {
    // Preparar a URL base da API com o protocolo correto
    let baseUrl = url;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    
    // Remover barra final se existir
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Criar URL da API de contatos (endpoint simples para testar)
    const apiUrl = `${baseUrl}/api/contacts?limit=1`;
    
    // Criar token de autenticação Basic
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Configurar axios para ignorar erros de certificado em desenvolvimento
    const axiosConfig = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Apenas em dev! Remover em produção!
      })
    };
    
    // Tentar fazer a requisição
    const response = await axios.get(apiUrl, axiosConfig);
    
    // Se chegou até aqui, a conexão foi bem-sucedida
    if (response.status === 200) {
      return { success: true, message: 'Conexão estabelecida com sucesso.' };
    } else {
      return { success: false, message: `Falha na conexão: Código de status ${response.status}` };
    }
  } catch (error) {
    console.error('Erro no teste de conexão:', error);
    let errorMessage = 'Falha ao conectar com o provedor';
    
    if (error.response) {
      // Erro de resposta da API
      errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Falha na autenticação'}`;
    } else if (error.request) {
      // Erro de rede (sem resposta)
      errorMessage = 'Falha na conexão: servidor não responde';
    } else {
      // Outros erros
      errorMessage = error.message || 'Erro desconhecido na conexão';
    }
    
    return { success: false, message: errorMessage };
  }
};

// Criar uma nova conta com teste de conexão integrado
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
    
    // Testar a conexão diretamente durante a criação da conta
    if (provider === 'mautic') {
      const connectionResult = await testMauticConnection(url, username, password);
      
      if (!connectionResult.success) {
        return responseUtils.error(res, `Não foi possível conectar. Verifique suas credenciais. ${connectionResult.message}`);
      }
      
      // Conexão bem-sucedida, prosseguir com a criação da conta
      const webhookId = uuidv4();
      const webhookUrl = `${process.env.BASE_URL}/api/webhooks/${webhookId}`;
      
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
        webhookId,
        webhookUrl,
        status: 'active',
        isConnected: true
      };
      
      // Criar a conta
      const newAccount = new Account(accountData);
      await newAccount.save();
      
      // Remover dados sensíveis antes de retornar
      const accountResponse = newAccount.toObject();
      delete accountResponse.credentials.password;
      
      return responseUtils.success(res, {
        ...accountResponse,
        message: 'Conta criada com sucesso. Conexão estabelecida.',
        webhookUrl
      }, 201);
    } else {
      // Para outros provedores (implementação futura)
      return responseUtils.error(res, 'Provedor não suportado atualmente');
    }
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
    
    // Se estiver atualizando credenciais, deve testar a conexão novamente
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
      
      // Conexão bem-sucedida, prosseguir com a atualização
      if (url) account.url = url;
      if (username) account.credentials.username = username;
      if (password) account.credentials.password = password;
      account.status = 'active';
      account.isConnected = true;
    }
    
    // Atualizar outros campos
    if (name) account.name = name;
    
    await account.save();
    
    // Remover dados sensíveis antes de retornar
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
  getMauticCampaigns,
  getMauticEmails
};
