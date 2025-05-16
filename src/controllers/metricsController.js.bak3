const mongoose = require("mongoose");
const { Metrics, Account, Campaign, Event, Email } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');
const filterUtil = require('../utils/filterUtil');

// Obter métricas por data
const getMetricsByDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      campaignIds, 
      emailIds, 
      groupBy = 'day' 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Validar o parâmetro groupBy
    if (!['day', 'week', 'month', 'year'].includes(groupBy)) {
      return responseUtils.error(res, 'O parâmetro groupBy deve ser day, week, month ou year');
    }
    
    // Construir o filtro
    const filter = {
      date: { $gte: start, $lte: end },
      period: groupBy,
      userId
    };
    
    // Processar accountIds como array
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        // Verificar se as contas pertencem ao usuário
        const accounts = await Account.find({ 
          _id: { $in: accountIdArray },
          userId 
        });
        
        if (accounts.length === 0) {
          return responseUtils.error(res, 'Nenhuma conta encontrada ou as contas não pertencem ao usuário');
        }
        
        // Usar apenas IDs de contas válidas
        const validAccountIds = accounts.map(account => account._id);
        filter.account = { $in: validAccountIds };
      }
    }
    
    // Processar campaignIds como array
    if (campaignIds) {
      const campaignIdArray = campaignIds.split(',');
      if (campaignIdArray.length > 0) {
        filter.campaign = { $in: campaignIdArray };
      }
    }
    
    // Processar emailIds (se implementado no modelo de métricas)
    if (emailIds) {
      const emailIdArray = emailIds.split(',');
      if (emailIdArray.length > 0) {
        filter.email = { $in: emailIdArray };
      }
    }
    
    // Buscar métricas
    const metrics = await Metrics.find(filter)
      .sort({ date: 1 })
      .populate('account', 'name provider')
      .populate('campaign', 'name');
    
    return responseUtils.success(res, metrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter métricas por conta
const getMetricsByAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, campaignIds, accountIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Determinar quais contas analisar
    let accountsToAnalyze = [];
    
    if (accountIds) {
      // Se foram especificados IDs específicos
      const accountIdArray = accountIds.split(',');
      accountsToAnalyze = await Account.find({ 
        _id: { $in: accountIdArray },
        userId
      }).select('_id name provider');
    } else {
      // Usar todas as contas do usuário
      accountsToAnalyze = await Account.find({ userId }).select('_id name provider');
    }
    
    if (accountsToAnalyze.length === 0) {
      return responseUtils.error(res, 'Nenhuma conta encontrada para o usuário');
    }
    
    // Para cada conta, buscamos suas métricas agregadas
    const accountMetrics = await Promise.all(
      accountsToAnalyze.map(async (account) => {
        // Construir filtro de métricas
        const filter = {
          account: account._id,
          date: { $gte: start, $lte: end },
          period: 'day',
          userId
        };
        
        // Processar campaignIds como array
        if (campaignIds) {
          const campaignIdArray = campaignIds.split(',');
          if (campaignIdArray.length > 0) {
            filter.campaign = { $in: campaignIdArray };
          }
        }
        
        // Buscar métricas desta conta
        const metrics = await Metrics.find(filter);
        
        // Agregação das métricas para esta conta
        const aggregatedMetrics = metrics.reduce((acc, curr) => {
          Object.keys(curr.metrics).forEach(key => {
            // Se for um contador, somamos
            if (key.endsWith('Count') || key === 'totalEvents') {
              acc[key] = (acc[key] || 0) + curr.metrics[key];
            }
            // Se for uma taxa, calculamos a média
            else if (key.endsWith('Rate')) {
              // Armazena os valores para calcular média ponderada depois
              if (!acc[`${key}Values`]) {
                acc[`${key}Values`] = [];
              }
              acc[`${key}Values`].push(curr.metrics[key]);
            }
          });
          
          return acc;
        }, {});
        
        // Calcular médias para as taxas
        Object.keys(aggregatedMetrics).forEach(key => {
          if (key.endsWith('Values')) {
            const rateKey = key.replace('Values', '');
            const values = aggregatedMetrics[key];
            
            if (values.length > 0) {
              // Média simples por enquanto
              aggregatedMetrics[rateKey] = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
            
            // Remover o array de valores
            delete aggregatedMetrics[key];
          }
        });
        
        return {
          account: {
            id: account._id,
            name: account.name,
            provider: account.provider
          },
          metrics: aggregatedMetrics
        };
      })
    );
    
    return responseUtils.success(res, accountMetrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter métricas por campanha
const getMetricsByCampaign = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountIds, campaignIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Determinar quais contas considerar
    let accountFilter = { userId };
    
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        accountFilter._id = { $in: accountIdArray };
      }
    }
    
    // Buscar contas que pertencem ao usuário
    const accounts = await Account.find(accountFilter).select('_id');
    
    if (accounts.length === 0) {
      return responseUtils.error(res, 'Nenhuma conta encontrada para o usuário');
    }
    
    const accountIdList = accounts.map(account => account._id);
    
    // Construir filtro para campanhas
    let campaignFilter = { account: { $in: accountIdList } };
    
    if (campaignIds) {
      const campaignIdArray = campaignIds.split(',');
      if (campaignIdArray.length > 0) {
        campaignFilter._id = { $in: campaignIdArray };
      }
    }
    
    // Buscar campanhas
    const campaigns = await Campaign.find(campaignFilter)
      .populate('account', 'name provider');
    
    // Para cada campanha, buscar suas métricas
    const campaignMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        // Buscar métricas desta campanha
        const metrics = await Metrics.find({
          campaign: campaign._id,
          date: { $gte: start, $lte: end },
          period: 'day',
          userId
        });
        
        // Agregar métricas
        const aggregatedMetrics = metrics.reduce((acc, curr) => {
          Object.keys(curr.metrics).forEach(key => {
            if (key.endsWith('Count') || key === 'totalEvents') {
              acc[key] = (acc[key] || 0) + curr.metrics[key];
            }
            else if (key.endsWith('Rate')) {
              if (!acc[`${key}Values`]) {
                acc[`${key}Values`] = [];
              }
              acc[`${key}Values`].push(curr.metrics[key]);
            }
          });
          return acc;
        }, {});
        
        // Calcular médias para as taxas
        Object.keys(aggregatedMetrics).forEach(key => {
          if (key.endsWith('Values')) {
            const rateKey = key.replace('Values', '');
            const values = aggregatedMetrics[key];
            
            if (values.length > 0) {
              aggregatedMetrics[rateKey] = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
            
            delete aggregatedMetrics[key];
          }
        });
        
        return {
          campaign: {
            id: campaign._id,
            name: campaign.name,
            status: campaign.status,
            sentDate: campaign.sentDate
          },
          account: {
            id: campaign.account._id,
            name: campaign.account.name,
            provider: campaign.account.provider
          },
          metrics: aggregatedMetrics
        };
      })
    );
    
    return responseUtils.success(res, campaignMetrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter métricas por email
const getMetricsByEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      campaignIds, 
      emailIds,
      limit = 100, 
      page = 1 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro para emails
    const emailFilter = { userId };
    
    // Processar filtros de múltiplos IDs
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        emailFilter.account = { $in: accountIdArray };
      }
    }
    
    if (campaignIds) {
      const campaignIdArray = campaignIds.split(',');
      if (campaignIdArray.length > 0) {
        emailFilter.campaign = { $in: campaignIdArray };
      }
    }
    
    if (emailIds) {
      const emailIdArray = emailIds.split(',');
      if (emailIdArray.length > 0) {
        emailFilter._id = { $in: emailIdArray };
      }
    }
    
    // Definir paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    
    // Buscar emails com paginação e informações relacionadas
    const emails = await Email.find(emailFilter)
      .populate('account', 'name provider')
      .populate('campaign', 'name')
      .sort({ sentDate: -1 })
      .skip(skip)
      .limit(pageSize);
    
    // Contar total para paginação
    const totalEmails = await Email.countDocuments(emailFilter);
    
    // Para cada email, buscar suas métricas com base em eventos
    const emailsWithMetrics = await Promise.all(
      emails.map(async (email) => {
        // Filtro para eventos deste email
        const eventFilter = {
          userId,
          emailId: email._id.toString(),
          timestamp: { $gte: start, $lte: end }
        };
        
        // Contar eventos por tipo
        const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
        const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
        const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
        const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
        const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
        const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
        
        // Contar contatos únicos para aberturas e cliques
        const uniqueOpeners = await Event.distinct('contactEmail', { ...eventFilter, eventType: 'open' });
        const uniqueClickers = await Event.distinct('contactEmail', { ...eventFilter, eventType: 'click' });
        
        // Métricas calculadas
        const metrics = {
          sentCount,
          deliveredCount,
          openCount,
          uniqueOpenCount: uniqueOpeners.length,
          clickCount,
          uniqueClickCount: uniqueClickers.length,
          bounceCount,
          unsubscribeCount
        };
        
        // Calcular taxas
        const openRate = deliveredCount > 0 ? (uniqueOpeners.length / deliveredCount) * 100 : 0;
        const clickRate = deliveredCount > 0 ? (uniqueClickers.length / deliveredCount) * 100 : 0;
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
        const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
        const clickToOpenRate = uniqueOpeners.length > 0 ? (uniqueClickers.length / uniqueOpeners.length) * 100 : 0;
        
        // Retornar dados formatados para o email
        return {
          id: email._id,
          subject: email.subject,
          sentDate: email.sentDate,
          campaign: email.campaign ? {
            id: email.campaign._id,
            name: email.campaign.name
          } : null,
          account: email.account ? {
            id: email.account._id,
            name: email.account.name,
            provider: email.account.provider
          } : null,
          metrics: {
            ...metrics,
            openRate,
            clickRate,
            bounceRate,
            unsubscribeRate,
            clickToOpenRate
          }
        };
      })
    );
    
    // Retornar com informações de paginação
    return responseUtils.success(res, {
      emails: emailsWithMetrics,
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

// Obter emails abertos
const getOpenedEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds, campaignIds, emailIds, limit = 50 } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir filtro
    const filter = {
      userId,
      eventType: 'open'
    };
    
    // Processar accountIds
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        filter.accountId = { $in: accountIdArray };
      }
    }
    
    // Processar campaignIds
    if (campaignIds) {
      const campaignIdArray = campaignIds.split(',');
      if (campaignIdArray.length > 0) {
        filter.campaignId = { $in: campaignIdArray };
      }
    }
    
    // Processar emailIds
    if (emailIds) {
      const emailIdArray = emailIds.split(',');
      if (emailIdArray.length > 0) {
        filter.emailId = { $in: emailIdArray };
      }
    }
    
    // Buscar eventos de abertura
    const openEvents = await Event.find(filter)
      .populate('account', 'name provider')
      .populate('campaign', 'name')
      .populate('email', 'subject')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));
    
    const formattedOpenEvents = openEvents.map(event => ({
      _id: event._id,
      timestamp: event.timestamp,
      contactEmail: event.contactEmail,
      campaignName: event.campaign ? event.campaign.name : 'Desconhecido',
      emailSubject: event.email ? event.email.subject : 'Desconhecido',
      accountName: event.account ? event.account.name : 'Desconhecido'
    }));
    
    return responseUtils.success(res, formattedOpenEvents);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter data do último envio
const getLastSendDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds, campaignIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir filtro
    const filter = {
      userId,
      eventType: 'send'
    };
    
    // Processar accountIds
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        filter.accountId = { $in: accountIdArray };
      }
    }
    
    // Processar campaignIds
    if (campaignIds) {
      const campaignIdArray = campaignIds.split(',');
      if (campaignIdArray.length > 0) {
        filter.campaignId = { $in: campaignIdArray };
      }
    }
    
    // Buscar o evento de envio mais recente
    const lastSendEvent = await Event.findOne(filter)
      .sort({ timestamp: -1 });
    
    const lastSendDate = lastSendEvent ? lastSendEvent.timestamp : null;
    
    return responseUtils.success(res, { lastSend: lastSendDate });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter taxas (CTR, bounce, unsubscribe)
const getRates = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds, campaignIds, emailIds } = req.query;
    
    // Implementação simplificada para calcular as taxas...
    // Devido à complexidade, esta seria uma implementação mais extensa
    // que considera os parâmetros de filtro múltiplos
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter taxa de envio por conta
const getSendRate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds } = req.query;
    
    // Implementação com suporte a múltiplos IDs de conta...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter envios diários
const getDailySends = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds, campaignIds, emailIds } = req.query;
    
    // Implementação com suporte a múltiplos IDs...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter aberturas diárias
const getDailyOpens = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds, campaignIds, emailIds } = req.query;
    
    // Implementação com suporte a múltiplos IDs...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter cliques diários
const getDailyClicks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds, campaignIds, emailIds } = req.query;
    
    // Implementação com suporte a múltiplos IDs...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Método para obter eventos com suporte a múltiplos IDs
const getEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, eventType } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir filtro usando o utilitário
    const filter = filterUtil.buildFilter(userId, req.query);
    
    // Adicionar filtro de tipo de evento se fornecido
    if (eventType) {
      filter.eventType = eventType;
    }
    
    // Buscar eventos
    const events = await Event.find(filter)
      .populate('account', 'name provider')
      .populate('campaign', 'name')
      .populate('email', 'subject')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));
    
    // Formatar os dados para o frontend
    const formattedEvents = events.map(event => ({
      _id: event._id,
      eventType: event.eventType,
      timestamp: event.timestamp,
      campaignName: event.campaign ? event.campaign.name : 'Desconhecido',
      contactEmail: event.contactEmail,
      emailSubject: event.email ? event.email.subject : 'Desconhecido',
      emailId: event.email ? event.email._id : null,
      accountName: event.account ? event.account.name : 'Desconhecido',
      accountId: event.account ? event.account._id : null,
      campaignId: event.campaign ? event.campaign._id : null
    }));
    
    return responseUtils.success(res, formattedEvents);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Método para comparar métricas entre múltiplos itens
const compareMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      campaignIds, 
      emailIds, 
      compareType = 'accounts' 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar o tipo de comparação
    const validCompareTypes = ['accounts', 'campaigns', 'emails'];
    if (!validCompareTypes.includes(compareType)) {
      return responseUtils.error(res, `Tipo de comparação inválido. Use um dos seguintes: ${validCompareTypes.join(', ')}`);
    }
    
    // Verificar se pelo menos um ID foi fornecido para comparação
    const { accountIdArray, campaignIdArray, emailIdArray } = filterUtil.processMultipleIdsParams(req.query);
    
    // Verificar se há IDs para comparar com base no tipo de comparação
    switch (compareType) {
      case 'accounts':
        if (!accountIdArray || accountIdArray.length < 1) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos uma conta para comparação');
        }
        break;
      case 'campaigns':
        if (!campaignIdArray || campaignIdArray.length < 1) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos uma campanha para comparação');
        }
        break;
      case 'emails':
        if (!emailIdArray || emailIdArray.length < 1) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos um email para comparação');
        }
        break;
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Variável para armazenar os resultados da comparação
    let comparisonResults = [];
    
    // Realizar a comparação com base no tipo selecionado
    switch (compareType) {
      case 'accounts':
        // Verificar se as contas pertencem ao usuário
        const accounts = await Account.find({ 
          _id: { $in: accountIdArray },
          userId
        });
        
        if (accounts.length === 0) {
          return responseUtils.error(res, 'Nenhuma conta válida encontrada para o usuário');
        }
        
        // Buscar eventos para cada conta no período especificado
        comparisonResults = await Promise.all(
          accounts.map(async (account) => {
            const eventFilter = {
              userId,
              accountId: account._id.toString(),
              timestamp: { $gte: start, $lte: end }
            };
            
            // Contar eventos por tipo
            const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
            const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
            const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
            const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
            const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
            const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
            
            // Calcular taxas
            const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
            const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
            const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
            const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
            const clickToOpenRate = openCount > 0 ? (clickCount / openCount) * 100 : 0;
            
            return {
              id: account._id,
              name: account.name,
              provider: account.provider,
              metrics: {
                sentCount,
                deliveredCount,
                openCount,
                clickCount,
                bounceCount,
                unsubscribeCount,
                openRate,
                clickRate,
                bounceRate,
                unsubscribeRate,
                clickToOpenRate
              }
            };
          })
        );
        break;
        
      case 'campaigns':
        // Verificar se as campanhas existem
        const campaigns = await Campaign.find({ 
          _id: { $in: campaignIdArray }
        }).populate('account', 'name provider');
        
        if (campaigns.length === 0) {
          return responseUtils.error(res, 'Nenhuma campanha válida encontrada');
        }
        
        // Verificar se as contas das campanhas pertencem ao usuário
        const campaignAccountIds = campaigns.map(campaign => campaign.account._id.toString());
        const userAccounts = await Account.find({ 
          _id: { $in: campaignAccountIds },
          userId 
        });
        
        const validAccountIds = userAccounts.map(account => account._id.toString());
        const validCampaigns = campaigns.filter(campaign => 
          validAccountIds.includes(campaign.account._id.toString())
        );
        
        if (validCampaigns.length === 0) {
          return responseUtils.error(res, 'Nenhuma campanha válida pertence ao usuário');
        }
        
        // Buscar eventos para cada campanha no período especificado
        comparisonResults = await Promise.all(
          validCampaigns.map(async (campaign) => {
            const eventFilter = {
              userId,
              campaignId: campaign._id.toString(),
              timestamp: { $gte: start, $lte: end }
            };
            
            // Contar eventos por tipo
            const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
            const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
            const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
            const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
            const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
            const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
            
            // Calcular taxas
            const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
            const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
            const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
            const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
            const clickToOpenRate = openCount > 0 ? (clickCount / openCount) * 100 : 0;
            
            return {
              id: campaign._id,
              name: campaign.name,
              account: {
                id: campaign.account._id,
                name: campaign.account.name,
                provider: campaign.account.provider
              },
              metrics: {
                sentCount,
                deliveredCount,
                openCount,
                clickCount,
                bounceCount,
                unsubscribeCount,
                openRate,
                clickRate,
                bounceRate,
                unsubscribeRate,
                clickToOpenRate
              }
            };
          })
        );
        break;
        
      case 'emails':
        // Buscar os emails especificados
        const emails = await Email.find({ 
          _id: { $in: emailIdArray },
          userId
        })
        .populate('account', 'name provider')
        .populate('campaign', 'name');
        
        if (emails.length === 0) {
          return responseUtils.error(res, 'Nenhum email válido encontrado para o usuário');
        }
        
        // Buscar eventos para cada email no período especificado
        comparisonResults = await Promise.all(
          emails.map(async (email) => {
            const eventFilter = {
              userId,
              emailId: email._id.toString(),
              timestamp: { $gte: start, $lte: end }
            };
            
            // Contar eventos por tipo
            const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
            const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
            const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
            const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
            const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
            const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
            
            // Calcular taxas
            const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
            const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
            const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
            const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
            const clickToOpenRate = openCount > 0 ? (clickCount / openCount) * 100 : 0;
            
            return {
              id: email._id,
              subject: email.subject,
              sentDate: email.sentDate,
              campaign: email.campaign ? {
                id: email.campaign._id,
                name: email.campaign.name
              } : null,
              account: email.account ? {
                id: email.account._id,
                name: email.account.name,
                provider: email.account.provider
              } : null,
              metrics: {
                sentCount,
                deliveredCount,
                openCount,
                clickCount,
                bounceCount,
                unsubscribeCount,
                openRate,
                clickRate,
                bounceRate,
                unsubscribeRate,
                clickToOpenRate
              }
            };
          })
        );
        break;
    }
    
    // Calcular totais e médias para comparação
    const totals = {
      sentCount: 0,
      deliveredCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0
    };
    
    // Calcular totais
    comparisonResults.forEach(item => {
      totals.sentCount += item.metrics.sentCount || 0;
      totals.deliveredCount += item.metrics.deliveredCount || 0;
      totals.openCount += item.metrics.openCount || 0;
      totals.clickCount += item.metrics.clickCount || 0;
      totals.bounceCount += item.metrics.bounceCount || 0;
      totals.unsubscribeCount += item.metrics.unsubscribeCount || 0;
    });
    
    // Calcular médias
    const averages = {
      openRate: totals.deliveredCount > 0 ? (totals.openCount / totals.deliveredCount) * 100 : 0,
      clickRate: totals.deliveredCount > 0 ? (totals.clickCount / totals.deliveredCount) * 100 : 0,
      bounceRate: totals.sentCount > 0 ? (totals.bounceCount / totals.sentCount) * 100 : 0,
      unsubscribeRate: totals.deliveredCount > 0 ? (totals.unsubscribeCount / totals.deliveredCount) * 100 : 0,
      clickToOpenRate: totals.openCount > 0 ? (totals.clickCount / totals.openCount) * 100 : 0
    };
    
    // Determinar o melhor performer com base na taxa de clique e abertura
    let bestPerformer = null;
    if (comparisonResults.length > 0) {
      // Ordenar por taxa de clique e depois por taxa de abertura
      const sorted = [...comparisonResults].sort((a, b) => {
        if (a.metrics.clickRate === b.metrics.clickRate) {
          return b.metrics.openRate - a.metrics.openRate;
        }
        return b.metrics.clickRate - a.metrics.clickRate;
      });
      
      bestPerformer = {
        id: sorted[0].id,
        name: sorted[0].name || sorted[0].subject,
        metrics: {
          openRate: sorted[0].metrics.openRate,
          clickRate: sorted[0].metrics.clickRate,
          clickToOpenRate: sorted[0].metrics.clickToOpenRate
        }
      };
    }
    
    // Preparar dados para visualização comparativa
    const comparisonData = {
      compareType,
      dateRange: {
        start,
        end
      },
      items: comparisonResults,
      totals,
      averages,
      bestPerformer
    };
    
    return responseUtils.success(res, comparisonData);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  compareMetrics,
  getMetricsByDate,
  getMetricsByAccount,
  getMetricsByCampaign,
  getMetricsByEmail,
  getOpenedEmails,
  getLastSendDate,
  getRates,
  getSendRate,
  getDailySends,
  getDailyOpens,
  getDailyClicks,
  getEvents
};
