const { Account, Email, Event } = require('../models');
const LeadStats = require('../models/leadStatsModel');
const responseUtils = require('../utils/responseUtil');

const getBrasilDate = (date) => {
  const d = new Date(date);
  d.setHours(d.getHours() - 3);
  return d;
};

const formatDate = (date) => {
  const d = getBrasilDate(date);
  return d.toISOString().split('T')[0];
};

const collectInitialData = async (accountId, daysBack = 7) => {
  try {
    console.log(`Iniciando coleta histórica para conta ${accountId} - ${daysBack} dias`);
    
    const account = await Account.findById(accountId);
    if (!account) return;
    
    for (let i = 0; i < daysBack; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      
      try {
        const startDate = `${dateStr} 00:00:00`;
        const endDate = `${dateStr} 23:59:59`;
        
        const result = await account.getMauticLeadsByDate(startDate, endDate);
        
        if (result.success) {
          await LeadStats.findOneAndUpdate(
            { userId: account.userId, accountId: account._id.toString(), date: dateStr },
            { count: result.total, lastUpdated: new Date() },
            { upsert: true, new: true }
          );
          
          console.log(`✅ ${dateStr}: ${result.total} leads coletados`);
        } else {
          console.log(`❌ ${dateStr}: Falha - ${result.message}`);
        }
        
        if (i < daysBack - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
      } catch (error) {
        console.error(`Erro coletando dados de ${dateStr}:`, error.message);
      }
    }
    
    console.log(`Coleta histórica concluída para conta ${account.name}`);
    
  } catch (error) {
    console.error('Erro na coleta inicial:', error.message);
  }
};

const listAccounts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const filter = { userId };
    
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        filter._id = { $in: accountIdArray };
      }
    }
    
    const accounts = await Account.find(filter)
      .sort({ name: 1 });
    
    const accountsWithStats = await Promise.all(accounts.map(async (account) => {
      const accountObj = account.toObject();
      
      const emailCount = await Email.countDocuments({ 
        userId,
        account: account._id 
      });
      
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

const getAccountDetails = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    const accountObj = account.toObject();
    
    const emailCount = await Email.countDocuments({ 
      userId,
      account: account._id 
    });
    
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
    
    const accountIdArray = accountIds.split(',');
    
    if (accountIdArray.length < 1) {
      return responseUtils.error(res, 'É necessário fornecer pelo menos uma conta para comparação');
    }
    
    const accounts = await Account.find({
      _id: { $in: accountIdArray },
      userId
    }).sort({ name: 1 });
    
    if (accounts.length === 0) {
      return responseUtils.notFound(res, 'Nenhuma conta encontrada com os IDs fornecidos');
    }
    
    const accountsForComparison = await Promise.all(accounts.map(async (account) => {
      const accountObj = account.toObject();
      
      const emailCount = await Email.countDocuments({ 
        userId,
        account: account._id 
      });
      
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
    
    const totals = {
      emailCount: 0,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0
    };
    
    accountsForComparison.forEach(account => {
      totals.emailCount += account.stats.emailCount;
      totals.sentCount += account.stats.sentCount;
      totals.openCount += account.stats.openCount;
      totals.clickCount += account.stats.clickCount;
      totals.bounceCount += account.stats.bounceCount;
      totals.unsubscribeCount += account.stats.unsubscribeCount;
    });
    
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
    
    const response = responseUtils.success(res, newAccount);
    
    process.nextTick(async () => {
      try {
        const testResult = await newAccount.getMauticEmails();
        if (testResult.success) {
          console.log(`🚀 Conta ${newAccount.name} conectada - iniciando coleta de 7 dias...`);
          await collectInitialData(newAccount._id, 7);
        }
      } catch (err) {
        console.log(`❌ Falha na coleta inicial: ${err.message}`);
      }
    });
    
    return response;
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const updateAccount = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    const { name, provider, url, username, password, status } = req.body;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    const updateData = {};
    
    if (name) updateData.name = name;
    if (provider) updateData.provider = provider;
    if (url) updateData.url = url;
    if (status) updateData.status = status;
    
    if (username || password) {
      updateData.credentials = { ...account.credentials };
      if (username) updateData.credentials.username = username;
      if (password) updateData.credentials.password = password;
    }
    
    const updatedAccount = await Account.findByIdAndUpdate(
      accountId,
      updateData,
      { new: true, runValidators: true }
    );
    
    const response = responseUtils.success(res, updatedAccount);
    
    if (username || password || url) {
      process.nextTick(async () => {
        try {
          const testResult = await updatedAccount.getMauticEmails();
          if (testResult.success) {
            console.log(`🔄 Conta ${updatedAccount.name} reconectada - coletando dados recentes...`);
            await collectInitialData(updatedAccount._id, 3);
          }
        } catch (err) {
          console.log(`❌ Falha no teste pós-atualização: ${err.message}`);
        }
      });
    }
    
    return response;
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    const emailCount = await Email.countDocuments({ 
      userId,
      account: accountId 
    });
    
    const eventCount = await Event.countDocuments({ 
      userId,
      account: accountId 
    });
    
    await Account.findByIdAndDelete(accountId);
    
    return responseUtils.success(res, {
      message: 'Conta deletada com sucesso',
      deletedAccount: {
        id: accountId,
        name: account.name
      },
      relatedDataDeleted: {
        emails: emailCount,
        events: eventCount
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const getAccountWebhook = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
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

const getMauticEmails = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    const { search, limit = 100 } = req.query;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    const mauticResponse = await account.getMauticEmails();
    
    if (!mauticResponse.success) {
      return responseUtils.error(res, mauticResponse.message);
    }
    
    let emails = Object.values(mauticResponse.emails || {});
    
    if (search) {
      const searchTerm = search.toLowerCase();
      emails = emails.filter(email => 
        (email.name && email.name.toLowerCase().includes(searchTerm)) ||
        (email.subject && email.subject.toLowerCase().includes(searchTerm)) ||
        (email.fromName && email.fromName.toLowerCase().includes(searchTerm))
      );
    }
    
    if (limit && parseInt(limit) > 0) {
      emails = emails.slice(0, parseInt(limit));
    }
    
    const emailsWithMetrics = await Promise.all(emails.map(async (mauticEmail) => {
      const localEmail = await Email.findOne({
        userId,
        account: account._id,
        externalId: mauticEmail.id.toString()
      });
      
      return {
        id: mauticEmail.id,
        name: mauticEmail.name,
        subject: mauticEmail.subject,
        fromName: mauticEmail.fromName,
        fromEmail: mauticEmail.fromAddress,
        dateCreated: mauticEmail.dateAdded,
        dateModified: mauticEmail.dateModified,
        publishUp: mauticEmail.publishUp,
        publishDown: mauticEmail.publishDown,
        readCount: mauticEmail.readCount || 0,
        sentCount: mauticEmail.sentCount || 0,
        localMetrics: localEmail ? localEmail.metrics : null,
        hasLocalData: !!localEmail,
        status: mauticEmail.isPublished ? 'published' : 'draft'
      };
    }));
    
    return responseUtils.success(res, {
      source: 'mautic',
      account: {
        id: account._id,
        name: account.name,
        url: account.url
      },
      emails: emailsWithMetrics,
      total: mauticResponse.total,
      searchApplied: !!search,
      searchTerm: search || null
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const getMauticEmailDetails = async (req, res) => {
  try {
    const { userId, accountId, emailId } = req.params;
    
    if (!userId || !accountId || !emailId) {
      return responseUtils.error(res, 'User ID, Account ID e Email ID são obrigatórios');
    }
    
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    const mauticResponse = await account.getMauticEmails();
    
    if (!mauticResponse.success) {
      return responseUtils.error(res, mauticResponse.message);
    }
    
    const mauticEmail = mauticResponse.emails.find(email => 
      email.id.toString() === emailId.toString()
    );
    
    if (!mauticEmail) {
      return responseUtils.notFound(res, 'Email não encontrado no Mautic');
    }
    
    const localEmail = await Email.findOne({
      userId,
      account: account._id,
      externalId: emailId.toString()
    });
    
    const events = await Event.find({
      userId,
      account: account._id,
      email: localEmail ? localEmail._id : null
    }).sort({ timestamp: -1 }).limit(100);
    
    const emailDetails = {
      id: mauticEmail.id,
      name: mauticEmail.name,
      subject: mauticEmail.subject,
      fromName: mauticEmail.fromName,
      fromEmail: mauticEmail.fromAddress,
      dateCreated: mauticEmail.dateAdded,
      dateModified: mauticEmail.dateModified,
      publishUp: mauticEmail.publishUp,
      publishDown: mauticEmail.publishDown,
      isPublished: mauticEmail.isPublished,
      mauticMetrics: {
        readCount: mauticEmail.readCount || 0,
        sentCount: mauticEmail.sentCount || 0,
        variant: {
          sentCount: mauticEmail.variantSentCount || 0,
          readCount: mauticEmail.variantReadCount || 0
        }
      },
      localMetrics: localEmail ? localEmail.metrics : null,
      hasLocalData: !!localEmail,
      recentEvents: events.map(event => ({
        id: event._id,
        type: event.eventType,
        timestamp: event.timestamp,
        contactEmail: event.contactEmail,
        url: event.url || null
      }))
    };
    
    return responseUtils.success(res, {
      source: 'mautic',
      account: {
        id: account._id,
        name: account.name,
        url: account.url
      },
      email: emailDetails
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const testConnection = async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    if (!userId || !accountId) {
      return responseUtils.error(res, 'User ID e Account ID são obrigatórios');
    }
    
    const account = await Account.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    const testResult = await account.getMauticEmails();
    
    const response = responseUtils.success(res, {
      connected: testResult.success,
      message: testResult.success ? 'Conexão estabelecida com sucesso' : testResult.message,
      account: {
        id: account._id,
        name: account.name,
        isConnected: account.isConnected,
        lastSync: account.lastSync
      },
      details: testResult.success ? {
        emailsFound: testResult.total || 0
      } : null
    });
    
    if (testResult.success) {
      process.nextTick(async () => {
        try {
          console.log(`🔄 Teste de conexão bem-sucedido - coletando últimos 3 dias para ${account.name}...`);
          await collectInitialData(account._id, 3);
        } catch (err) {
          console.log(`❌ Falha na coleta pós-teste: ${err.message}`);
        }
      });
    }
    
    return response;
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  listAccounts,
  getAccountDetails,
  compareAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountWebhook,
  getMauticEmails,
  getMauticEmailDetails,
  testConnection
};
