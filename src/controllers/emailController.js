const { Email, Account } = require('../models');
const responseUtils = require('../utils/responseUtil');
const { createSmartSearchFilter, highlightSearchTerms } = require('../utils/smartSearch');

// Listar emails com busca inteligente
const listEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      accountIds, 
      emailIds,
      search,
      highlight = false,
      limit = 100, 
      page = 1 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir filtro base
    const filter = { userId };
    
    // Processar filtro de múltiplas contas
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        filter.account = { $in: accountIdArray };
      }
    }
    
    // Processar filtro de múltiplos emails
    if (emailIds) {
      const emailIdArray = emailIds.split(',');
      if (emailIdArray.length > 0) {
        filter._id = { $in: emailIdArray };
      }
    }
    
    // Busca inteligente que funciona com e sem acentos
    if (search) {
      const searchFilter = createSmartSearchFilter(search, ['name', 'subject', 'fromName', 'fromEmail']);
      Object.assign(filter, searchFilter);
    }
    
    // Definir paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    
    // Buscar emails com todas as informações relevantes
    const emails = await Email.find(filter)
      .populate('account', 'name provider')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    
    // Contar total para paginação
    const totalEmails = await Email.countDocuments(filter);
    
    // Incluir o nome das contas e destacar termos de busca
    const emailsWithAccountInfo = emails.map(email => {
      const emailObj = email.toObject();
      emailObj.accountName = email.account ? email.account.name : 'Conta Desconhecida';
      emailObj.accountProvider = email.account ? email.account.provider : 'desconhecido';
      
      // Adicionar termos destacados se solicitado
      if (search && highlight === 'true') {
        emailObj.highlightedName = highlightSearchTerms(emailObj.name, search);
        emailObj.highlightedSubject = highlightSearchTerms(emailObj.subject, search);
        emailObj.highlightedFromName = highlightSearchTerms(emailObj.fromName, search);
      }
      
      return emailObj;
    });
    
    // Retornar com informações de paginação e busca
    return responseUtils.success(res, {
      emails: emailsWithAccountInfo,
      searchInfo: search ? {
        term: search,
        resultsCount: totalEmails,
        highlightEnabled: highlight === 'true'
      } : null,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalItems: totalEmails,
        totalPages: Math.ceil(totalEmails / pageSize)
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Buscar emails com sugestões (autocomplete)
const searchEmailsWithSuggestions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { q, limit = 10 } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    if (!q || q.length < 2) {
      return responseUtils.success(res, { suggestions: [] });
    }
    
    // Busca inteligente para sugestões
    const searchFilter = createSmartSearchFilter(q, ['name', 'subject']);
    const filter = { userId, ...searchFilter };
    
    const emails = await Email.find(filter)
      .select('name subject fromName _id')
      .populate('account', 'name')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Criar sugestões destacadas
    const suggestions = emails.map(email => ({
      id: email._id,
      name: email.name,
      subject: email.subject,
      accountName: email.account ? email.account.name : 'Desconhecida',
      highlightedName: highlightSearchTerms(email.name, q),
      highlightedSubject: highlightSearchTerms(email.subject, q),
      type: 'email'
    }));
    
    return responseUtils.success(res, { 
      query: q,
      suggestions 
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter detalhes de um email específico
const getEmailDetails = async (req, res) => {
  try {
    const { userId, emailId } = req.params;
    
    if (!userId || !emailId) {
      return responseUtils.error(res, 'User ID e Email ID são obrigatórios');
    }
    
    const email = await Email.findOne({
      _id: emailId,
      userId
    })
    .populate('account', 'name provider');
    
    if (!email) {
      return responseUtils.notFound(res, 'Email não encontrado');
    }
    
    const emailWithAccountInfo = email.toObject();
    emailWithAccountInfo.accountName = email.account ? email.account.name : 'Conta Desconhecida';
    emailWithAccountInfo.accountProvider = email.account ? email.account.provider : 'desconhecido';
    
    return responseUtils.success(res, emailWithAccountInfo);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Comparar múltiplos emails
const compareEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { emailIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    if (!emailIds) {
      return responseUtils.error(res, 'É necessário fornecer IDs de emails para comparação');
    }
    
    const emailIdArray = emailIds.split(',');
    
    if (emailIdArray.length < 1) {
      return responseUtils.error(res, 'É necessário fornecer pelo menos um email para comparação');
    }
    
    const emails = await Email.find({
      _id: { $in: emailIdArray },
      userId
    })
    .populate('account', 'name provider');
    
    if (emails.length === 0) {
      return responseUtils.notFound(res, 'Nenhum email encontrado com os IDs fornecidos');
    }
    
    const emailsForComparison = emails.map(email => {
      const emailObj = email.toObject();
      emailObj.accountName = email.account ? email.account.name : 'Conta Desconhecida';
      emailObj.accountProvider = email.account ? email.account.provider : 'desconhecido';
      
      // Calcular taxas das métricas do email
      const m = emailObj.metrics || {};
      emailObj.stats = {
        openRate: m.sentCount > 0 ? (m.uniqueOpenCount / m.sentCount) * 100 : 0,
        clickRate: m.sentCount > 0 ? (m.uniqueClickCount / m.sentCount) * 100 : 0,
        clickToOpenRate: m.uniqueOpenCount > 0 ? (m.uniqueClickCount / m.uniqueOpenCount) * 100 : 0,
        bounceRate: m.sentCount > 0 ? (m.bounceCount / m.sentCount) * 100 : 0,
        unsubscribeRate: m.sentCount > 0 ? (m.unsubscribeCount / m.sentCount) * 100 : 0,
      };
      
      return emailObj;
    });
    
    const emailsByAccount = {};
    
    emailsForComparison.forEach(email => {
      const accountId = email.account ? email.account.id : 'unknown';
      const accountName = email.accountName;
      
      if (!emailsByAccount[accountId]) {
        emailsByAccount[accountId] = {
          accountId,
          accountName,
          accountProvider: email.accountProvider,
          emails: []
        };
      }
      
      emailsByAccount[accountId].emails.push(email);
    });
    
    return responseUtils.success(res, {
      emailsByAccount: Object.values(emailsByAccount),
      emailsForComparison
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Listar emails agrupados por conta
const listEmailsByAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { search, limit = 100, page = 1 } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const accounts = await Account.find({ userId }).sort({ name: 1 });
    
    if (accounts.length === 0) {
      return responseUtils.success(res, { accounts: [], emailsByAccount: {} });
    }
    
    const emailFilter = { userId };
    
    if (search) {
      const searchFilter = createSmartSearchFilter(search, ['name', 'subject', 'fromName', 'fromEmail']);
      Object.assign(emailFilter, searchFilter);
    }
    
    const emailsByAccount = {};
    
    accounts.forEach(account => {
      emailsByAccount[account._id.toString()] = {
        account: {
          id: account._id,
          name: account.name,
          provider: account.provider,
          status: account.status
        },
        emails: []
      };
    });
    
    const pageSize = parseInt(limit);
    const skip = (parseInt(page) - 1) * pageSize;
    
    const emails = await Email.find(emailFilter)
      .populate('account', 'name provider')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    
    emails.forEach(email => {
      if (email.account) {
        const accountId = email.account._id.toString();
        
        if (emailsByAccount[accountId]) {
          const emailObj = email.toObject();
          emailObj.accountName = email.account.name;
          emailObj.accountProvider = email.account.provider;
          
          emailsByAccount[accountId].emails.push(emailObj);
        }
      }
    });
    
    const totalEmails = await Email.countDocuments(emailFilter);
    
    return responseUtils.success(res, {
      accounts: accounts.map(a => ({ 
        id: a._id, 
        name: a.name, 
        provider: a.provider, 
        status: a.status 
      })),
      emailsByAccount,
      pagination: {
        page: parseInt(page),
        pageSize,
        totalItems: totalEmails,
        totalPages: Math.ceil(totalEmails / pageSize)
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  listEmails,
  searchEmailsWithSuggestions,
  getEmailDetails,
  compareEmails,
  listEmailsByAccount
};
