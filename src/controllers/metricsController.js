const { getMetricsSummary } = require("./metricsSummaryController");
const mongoose = require("mongoose");
const { Metrics, Account, Campaign, Event, Email } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

// Obter resumo geral de métricas
const getMetricsSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Obter estatísticas gerais de emails
    const emailCount = await Email.countDocuments({ userId });
    const eventCount = await Event.countDocuments({ userId });
    
    // Contar eventos por tipo
    const sentCount = await Event.countDocuments({ userId, eventType: 'send' });
    const openCount = await Event.countDocuments({ userId, eventType: 'open' });
    const clickCount = await Event.countDocuments({ userId, eventType: 'click' });
    const bounceCount = await Event.countDocuments({ userId, eventType: 'bounce' });
    const unsubscribeCount = await Event.countDocuments({ userId, eventType: 'unsubscribe' });
    
    // Contar eventos únicos (usando isFirstInteraction = true)
    const uniqueOpenCount = await Event.countDocuments({ userId, eventType: 'open', isFirstInteraction: true });
    const uniqueClickCount = await Event.countDocuments({ userId, eventType: 'click', isFirstInteraction: true });
    
    // Calcular taxas
    const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
    const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
    const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
    const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
    
    // Calcular taxas únicas
    const uniqueOpenRate = sentCount > 0 ? (uniqueOpenCount / sentCount) * 100 : 0;
    const uniqueClickRate = sentCount > 0 ? (uniqueClickCount / sentCount) * 100 : 0;
    
    // Calcular CTR (Click-Through Rate)
    const ctr = openCount > 0 ? (clickCount / openCount) * 100 : 0;
    const uniqueCtr = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
    
    return responseUtils.success(res, {
      counts: {
        emailCount,
        eventCount,
        sentCount,
        openCount,
        uniqueOpenCount,
        clickCount,
        uniqueClickCount,
        bounceCount,
        unsubscribeCount
      },
      rates: {
        openRate,
        uniqueOpenRate,
        clickRate,
        uniqueClickRate,
        ctr,
        uniqueCtr,
        bounceRate,
        unsubscribeRate
      },
      note: "Para métricas mais detalhadas, utilize os endpoints específicos: /by-date, /by-email, /by-account, etc."
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};


// Obter métricas por data
const getMetricsByDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, groupBy = 'day' } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Validar o parâmetro groupBy
    if (!['hour', 'day', 'week', 'month'].includes(groupBy)) {
      return responseUtils.error(res, 'O parâmetro groupBy deve ser: hour, day, week ou month');
    }
    
    // Construir o filtro
    let filter = {
      userId,
      timestamp: { $gte: start, $lte: end }
    };
    
    if (accountId) filter.accountId = accountId;
    if (campaignId) filter.campaignId = campaignId;
    
    // Filtro de emailId pode ser um único ID ou uma lista
    if (emailId) {
      filter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = JSON.parse(emailIds);
        filter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser um JSON válido');
      }
    }
    
    // Construir o pipeline de agregação
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: {
            eventType: '$eventType',
            date: dateHelpers.getGroupByDateFormat('$timestamp', groupBy)
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ];
    
    const results = await Event.aggregate(pipeline);
    
    // Organizar os resultados por data e tipo de evento
    const metrics = {};
    
    results.forEach(item => {
      const { eventType, date } = item._id;
      const formattedDate = dateHelpers.formatDate(date, groupBy);
      
      if (!metrics[formattedDate]) {
        metrics[formattedDate] = {
          send: 0,
          open: 0,
          click: 0,
          bounce: 0,
          unsubscribe: 0
        };
      }
      
      metrics[formattedDate][eventType] = item.count;
    });
    
    return responseUtils.success(res, {
      startDate: start,
      endDate: end,
      groupBy,
      metrics
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter métricas por conta
const getMetricsByAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Buscar todas as contas do usuário
    const accounts = await Account.find({ userId });
    
    // Coletar métricas para cada conta
    const accountMetrics = [];
    
    for (const account of accounts) {
      // Contar eventos por tipo para esta conta
      const sentCount = await Event.countDocuments({
        userId,
        accountId: account._id,
        eventType: 'send',
        timestamp: { $gte: start, $lte: end }
      });
      
      const openCount = await Event.countDocuments({
        userId,
        accountId: account._id,
        eventType: 'open',
        timestamp: { $gte: start, $lte: end }
      });
      
      const clickCount = await Event.countDocuments({
        userId,
        accountId: account._id,
        eventType: 'click',
        timestamp: { $gte: start, $lte: end }
      });
      
      const bounceCount = await Event.countDocuments({
        userId,
        accountId: account._id,
        eventType: 'bounce',
        timestamp: { $gte: start, $lte: end }
      });
      
      const unsubscribeCount = await Event.countDocuments({
        userId,
        accountId: account._id,
        eventType: 'unsubscribe',
        timestamp: { $gte: start, $lte: end }
      });
      
      // Calcular taxas
      const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
      const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
      const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
      const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
      
      // Adicionar ao array de métricas
      accountMetrics.push({
        accountId: account._id,
        accountName: account.name,
        accountData: account.data || {},
        counts: {
          sent: sentCount,
          open: openCount,
          click: clickCount,
          bounce: bounceCount,
          unsubscribe: unsubscribeCount
        },
        rates: {
          openRate,
          clickRate,
          bounceRate,
          unsubscribeRate
        }
      });
    }
    
    // Ordenar por contagem de envios (decrescente)
    accountMetrics.sort((a, b) => b.counts.sent - a.counts.sent);
    
    return responseUtils.success(res, {
      startDate: start,
      endDate: end,
      accounts: accountMetrics
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter métricas por campanha
const getMetricsByCampaign = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro para campanhas
    const campaignFilter = { userId };
    if (accountId) campaignFilter.accountId = accountId;
    
    // Buscar todas as campanhas do usuário (e da conta, se especificada)
    const campaigns = await Campaign.find(campaignFilter);
    
    // Coletar métricas para cada campanha
    const campaignMetrics = [];
    
    for (const campaign of campaigns) {
      // Contar eventos por tipo para esta campanha
      const sentCount = await Event.countDocuments({
        userId,
        campaignId: campaign._id,
        eventType: 'send',
        timestamp: { $gte: start, $lte: end }
      });
      
      const openCount = await Event.countDocuments({
        userId,
        campaignId: campaign._id,
        eventType: 'open',
        timestamp: { $gte: start, $lte: end }
      });
      
      const clickCount = await Event.countDocuments({
        userId,
        campaignId: campaign._id,
        eventType: 'click',
        timestamp: { $gte: start, $lte: end }
      });
      
      const bounceCount = await Event.countDocuments({
        userId,
        campaignId: campaign._id,
        eventType: 'bounce',
        timestamp: { $gte: start, $lte: end }
      });
      
      const unsubscribeCount = await Event.countDocuments({
        userId,
        campaignId: campaign._id,
        eventType: 'unsubscribe',
        timestamp: { $gte: start, $lte: end }
      });
      
      // Calcular taxas
      const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
      const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
      const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
      const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
      
      // Adicionar ao array de métricas
      campaignMetrics.push({
        campaignId: campaign._id,
        campaignName: campaign.name,
        campaignData: campaign.data || {},
        counts: {
          sent: sentCount,
          open: openCount,
          click: clickCount,
          bounce: bounceCount,
          unsubscribe: unsubscribeCount
        },
        rates: {
          openRate,
          clickRate,
          bounceRate,
          unsubscribeRate
        }
      });
    }
    
    // Ordenar por contagem de envios (decrescente)
    campaignMetrics.sort((a, b) => b.counts.sent - a.counts.sent);
    
    return responseUtils.success(res, {
      startDate: start,
      endDate: end,
      campaigns: campaignMetrics
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

    
// Método atualizado para suportar múltiplos IDs
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
    const { accountIdArray, campaignIdArray, emailIdArray } = filterUtil.processMultipleIdsParams(req.query);
    
    if (accountIdArray) {
      emailFilter.account = { $in: accountIdArray };
    }
    
    if (campaignIdArray) {
      emailFilter.campaign = { $in: campaignIdArray };
    }
    
    if (emailIdArray) {
      emailFilter._id = { $in: emailIdArray };
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
    // Verificar se há emails para buscar
    if (emailIds.length > 0) {
      // Buscar emails com paginação
      const emailQuery = {
        _id: { $in: emailIds },
        userId
      };
      
      // Aplicar filtros adicionais se existirem
      if (accountId) emailQuery.accountId = accountId;
      if (campaignId) emailQuery.campaignId = campaignId;
      
      emails = await Email.find(emailQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);
    }
    
    // Coletar métricas para cada email
    const emailMetrics = [];
    
    for (const email of emails) {
      // Contar eventos por tipo para este email
      const sentCount = await Event.countDocuments({
        userId,
        emailId: email._id,
        eventType: 'send'
      });
      
      const openCount = await Event.countDocuments({
        userId,
        emailId: email._id,
        eventType: 'open'
      });
      
      const clickCount = await Event.countDocuments({
        userId,
        emailId: email._id,
        eventType: 'click'
      });
      
      const bounceCount = await Event.countDocuments({
        userId,
        emailId: email._id,
        eventType: 'bounce'
      });
      
      const unsubscribeCount = await Event.countDocuments({
        userId,
        emailId: email._id,
        eventType: 'unsubscribe'
      });
      
      // Calcular taxas
      const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
      const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
      const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
      const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
      
      // Adicionar ao array de métricas
      emailMetrics.push({
        emailId: email._id,
        emailSubject: email.subject,
        emailData: email.data || {},
        createdAt: email.createdAt,
        counts: {
          sent: sentCount,
          open: openCount,
          click: clickCount,
          bounce: bounceCount,
          unsubscribe: unsubscribeCount
        },
        rates: {
          openRate,
          clickRate,
          bounceRate,
          unsubscribeRate
        }
      });
    }
    
    // Calcular paginação
    const totalEmails = emailIds.length;
    const totalPages = Math.ceil(totalEmails / pageSize);
    
    return responseUtils.success(res, {
      startDate: start,
      endDate: end,
      pagination: {
        total: totalEmails,
        page: parseInt(page),
        pageSize,
        totalPages
      },
      emails: emailMetrics
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter emails abertos
const getOpenedEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, includeUnique = false } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro para eventos de abertura
    const filter = {
      userId,
      eventType: 'open',
      timestamp: { $gte: start, $lte: end }
    };
    
    // Adicionar filtros adicionais
    if (accountId) filter.accountId = accountId;
    if (campaignId) filter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      filter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        filter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Contar total de aberturas
    const totalOpens = await Event.countDocuments(filter);
    
    // Contar aberturas únicas (por email de contato)
    const uniqueOpensAgg = await Event.aggregate([
      { $match: filter },
      { $group: { _id: '$contactEmail', count: { $sum: 1 } } },
      { $count: 'total' }
    ]);
    const uniqueOpens = uniqueOpensAgg.length > 0 ? uniqueOpensAgg[0].total : 0;
    
    // Contar envios
    const sentFilter = {
      ...filter,
      eventType: 'send'
    };
    const deliveredCount = await Event.countDocuments(sentFilter);
    
    // Calcular taxas
    const openRate = deliveredCount > 0 ? (totalOpens / deliveredCount) * 100 : 0;
    const uniqueOpenRate = deliveredCount > 0 ? (uniqueOpens / deliveredCount) * 100 : 0;
    
    // Obter as aberturas mais recentes
    const recentOpens = await Event.find(filter)
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    // Enriquecer os dados das aberturas recentes
    const enrichedRecentOpens = [];
    
    for (const open of recentOpens) {
      const email = open.emailId ? await Email.findById(open.emailId).lean() : null;
      const campaign = open.campaignId ? await Campaign.findById(open.campaignId).lean() : null;
      
      // Verificar se é uma abertura única (primeira para este contato+email)
      const isUnique = includeUnique === 'true' ? true : await Event.countDocuments({
        userId,
        eventType: 'open',
        contactEmail: open.contactEmail,
        emailId: open.emailId,
        timestamp: { $lt: open.timestamp }
      }) === 0;
      
      if (includeUnique === 'true' && !isUnique) continue;
      
      enrichedRecentOpens.push({
        id: open._id,
        contactEmail: open.contactEmail || 'N/A',
        timestamp: open.timestamp,
        isUnique: isUnique,
        campaign: campaign ? campaign.name : 'N/A',
        subject: email ? email.subject : 'N/A'
      });
    }
    
    return responseUtils.success(res, {
      metrics: {
        totalOpens,
        uniqueOpens,
        deliveredCount,
        openRate,
        uniqueOpenRate
      },
      recentOpens: enrichedRecentOpens
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter última data de envio
const getLastSendDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountId, campaignId, emailId, emailIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir filtro para eventos de envio
    const filter = {
      userId,
      eventType: 'send'
    };
    
    // Adicionar filtros adicionais
    if (accountId) filter.accountId = accountId;
    if (campaignId) filter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      filter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        filter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Obter o último envio
    const lastSend = await Event.findOne(filter)
      .sort({ timestamp: -1 })
      .lean();
    
    if (!lastSend) {
      return responseUtils.success(res, { lastSend: null });
    }
    
    // Enriquecer com dados relacionados
    const campaign = lastSend.campaignId ? await Campaign.findById(lastSend.campaignId).lean() : null;
    const email = lastSend.emailId ? await Email.findById(lastSend.emailId).lean() : null;
    
    return responseUtils.success(res, {
      lastSend: {
        date: lastSend.timestamp,
        campaign: campaign ? {
          id: campaign._id,
          name: campaign.name
        } : null,
        email: email ? {
          id: email._id,
          subject: email.subject
        } : null
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter taxas (CTR, Bounce, Unsubscribe)
const getRates = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, period = 'day' } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Validar o parâmetro period
    if (!['day', 'week', 'month'].includes(period)) {
      return responseUtils.error(res, 'O parâmetro period deve ser: day, week ou month');
    }
    
    // Construir filtro base
    const baseFilter = {
      userId,
      timestamp: { $gte: start, $lte: end }
    };
    
    // Adicionar filtros adicionais
    if (accountId) baseFilter.accountId = accountId;
    if (campaignId) baseFilter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      baseFilter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        baseFilter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Pipeline de agregação para calcular taxas por período
    const pipeline = [
      {
        $match: baseFilter
      },
      {
        $group: {
          _id: {
            period: dateHelpers.getGroupByDateFormat('$timestamp', period),
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.period': 1 }
      }
    ];
    
    const results = await Event.aggregate(pipeline);
    
    // Processar os resultados por período
    const periodData = {};
    
    results.forEach(result => {
      const formattedDate = dateHelpers.formatDate(result._id.period, period);
      const eventType = result._id.eventType;
      const count = result.count;
      
      if (!periodData[formattedDate]) {
        periodData[formattedDate] = {
          send: 0,
          open: 0,
          click: 0,
          bounce: 0,
          unsubscribe: 0
        };
      }
      
      periodData[formattedDate][eventType] = count;
    });
    
    // Calcular taxas para cada período
    const labels = Object.keys(periodData).sort();
    const ctrData = [];
    const bounceRateData = [];
    const unsubscribeRateData = [];
    
    labels.forEach(label => {
      const data = periodData[label];
      
      // CTR (Click-to-Open Rate)
      const ctr = data.open > 0 ? (data.click / data.open) * 100 : 0;
      ctrData.push(parseFloat(ctr.toFixed(2)));
      
      // Bounce Rate
      const bounceRate = data.send > 0 ? (data.bounce / data.send) * 100 : 0;
      bounceRateData.push(parseFloat(bounceRate.toFixed(2)));
      
      // Unsubscribe Rate
      const unsubscribeRate = data.send > 0 ? (data.unsubscribe / data.send) * 100 : 0;
      unsubscribeRateData.push(parseFloat(unsubscribeRate.toFixed(2)));
    });
    
    return responseUtils.success(res, {
      labels,
      datasets: [
        {
          label: 'CTR (Click-to-Open Rate)',
          data: ctrData
        },
        {
          label: 'Taxa de Bounce',
          data: bounceRateData
        },
        {
          label: 'Taxa de Unsubscribe',
          data: unsubscribeRateData
        }
      ]
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter taxa de envio por conta
const getSendRate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, campaignId, emailId, emailIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro base
    const baseFilter = {
      userId,
      eventType: 'send',
      timestamp: { $gte: start, $lte: end }
    };
    
    // Adicionar filtros adicionais
    if (campaignId) baseFilter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      baseFilter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        baseFilter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Buscar todas as contas do usuário
    const accounts = await Account.find({ userId });
    
    // Calcular envios por conta
    const labels = [];
    const data = [];
    
    for (const account of accounts) {
      labels.push(account.name);
      
      // Contar envios para esta conta
      const filter = {
        ...baseFilter,
        accountId: account._id
      };
      
      const count = await Event.countDocuments(filter);
      data.push(count);
    }
    
    return responseUtils.success(res, {
      labels,
      datasets: [
        {
          label: 'Emails Enviados',
          data
        }
      ]
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter envios diários
const getDailySends = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, emailId, emailIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro base
    const baseFilter = {
      userId,
      eventType: 'send',
      timestamp: { $gte: start, $lte: end }
    };
    
    // Adicionar filtros adicionais
    if (accountId) baseFilter.accountId = accountId;
    if (campaignId) baseFilter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      baseFilter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        baseFilter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Pipeline de agregação para calcular envios diários
    const pipeline = [
      {
        $match: baseFilter
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ];
    
    const results = await Event.aggregate(pipeline);
    
    // Processar os resultados
    const labels = [];
    const data = [];
    
    results.forEach(result => {
      const date = new Date(result._id.year, result._id.month - 1, result._id.day);
      labels.push(dateHelpers.formatDateISO(date));
      data.push(result.count);
    });
    
    return responseUtils.success(res, {
      labels,
      datasets: [
        {
          label: 'Emails Enviados',
          data
        }
      ]
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter aberturas diárias
const getDailyOpens = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, uniqueOnly = 'false' } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro base
    const baseFilter = {
      userId,
      eventType: 'open',
      timestamp: { $gte: start, $lte: end }
    };
    
    // Adicionar filtros adicionais
    if (accountId) baseFilter.accountId = accountId;
    if (campaignId) baseFilter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      baseFilter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        baseFilter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Pipeline de agregação para calcular aberturas diárias
    let pipeline;
    
    if (uniqueOnly === 'true') {
      // Para aberturas únicas (mais complexo, requer pré-processamento)
      // Obter todas as aberturas
      const allOpens = await Event.find(baseFilter).sort({ timestamp: 1 }).lean();
      
      // Filtrar apenas as primeiras aberturas únicas por contato+email
      const uniqueOpensMap = new Map();
      allOpens.forEach(open => {
        const key = `${open.contactEmail}-${open.emailId}`;
        if (!uniqueOpensMap.has(key)) {
          uniqueOpensMap.set(key, open);
        }
      });
      
      // Agrupar por data
      const dateGroups = {};
      Array.from(uniqueOpensMap.values()).forEach(open => {
        const date = dateHelpers.formatDateISO(open.timestamp);
        if (!dateGroups[date]) {
          dateGroups[date] = 0;
        }
        dateGroups[date]++;
      });
      
      // Converter para o formato esperado
      const labels = Object.keys(dateGroups).sort();
      const data = labels.map(label => dateGroups[label]);
      
      return responseUtils.success(res, {
        labels,
        datasets: [
          {
            label: 'Aberturas Únicas',
            data
          }
        ]
      });
    } else {
      // Para todas as aberturas (mais simples)
      pipeline = [
        {
          $match: baseFilter
        },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ];
      
      const results = await Event.aggregate(pipeline);
      
      // Processar os resultados
      const labels = [];
      const data = [];
      
      results.forEach(result => {
        const date = new Date(result._id.year, result._id.month - 1, result._id.day);
        labels.push(dateHelpers.formatDateISO(date));
        data.push(result.count);
      });
      
      return responseUtils.success(res, {
        labels,
        datasets: [
          {
            label: 'Aberturas Totais',
            data
          }
        ]
      });
    }
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter cliques diários
const getDailyClicks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, uniqueOnly = 'false' } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro base
    const baseFilter = {
      userId,
      eventType: 'click',
      timestamp: { $gte: start, $lte: end }
    };
    
    // Adicionar filtros adicionais
    if (accountId) baseFilter.accountId = accountId;
    if (campaignId) baseFilter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      baseFilter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        baseFilter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Pipeline de agregação para calcular cliques diários
    let pipeline;
    
    if (uniqueOnly === 'true') {
      // Para cliques únicos (mais complexo, requer pré-processamento)
      // Obter todos os cliques
      const allClicks = await Event.find(baseFilter).sort({ timestamp: 1 }).lean();
      
      // Filtrar apenas os primeiros cliques únicos por contato+email+link
      const uniqueClicksMap = new Map();
      allClicks.forEach(click => {
        const key = `${click.contactEmail}-${click.emailId}-${click.linkUrl || 'unknown'}`;
        if (!uniqueClicksMap.has(key)) {
          uniqueClicksMap.set(key, click);
        }
      });
      
      // Agrupar por data
      const dateGroups = {};
      Array.from(uniqueClicksMap.values()).forEach(click => {
        const date = dateHelpers.formatDateISO(click.timestamp);
        if (!dateGroups[date]) {
          dateGroups[date] = 0;
        }
        dateGroups[date]++;
      });
      
      // Converter para o formato esperado
      const labels = Object.keys(dateGroups).sort();
      const data = labels.map(label => dateGroups[label]);
      
      return responseUtils.success(res, {
        labels,
        datasets: [
          {
            label: 'Cliques Únicos',
            data
          }
        ]
      });
    } else {
      // Para todos os cliques (mais simples)
      pipeline = [
        {
          $match: baseFilter
        },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ];
      
      const results = await Event.aggregate(pipeline);
      
      // Processar os resultados
      const labels = [];
      const data = [];
      
      results.forEach(result => {
        const date = new Date(result._id.year, result._id.month - 1, result._id.day);
        labels.push(dateHelpers.formatDateISO(date));
        data.push(result.count);
      });
      
      return responseUtils.success(res, {
        labels,
        datasets: [
          {
            label: 'Cliques Totais',
            data
          }
        ]
      });
    }
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter eventos recentes com filtragem
const getEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, accountId, campaignId, emailId, emailIds, eventType } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir o filtro de consulta
    const filter = { userId };
    
    // Adicionar filtros opcionais se fornecidos
    if (accountId) filter.accountId = accountId;
    if (campaignId) filter.campaignId = campaignId;
    
    // Filtrar por email ID
    if (emailId) {
      filter.emailId = emailId;
    } else if (emailIds) {
      try {
        const ids = emailIds.split(',');
        filter.emailId = { $in: ids };
      } catch (e) {
        return responseUtils.error(res, 'O parâmetro emailIds deve ser uma lista válida de IDs separados por vírgula');
      }
    }
    
    // Filtrar por tipo de evento
    if (eventType) {
      filter.eventType = eventType;
    }
    
    // Buscar eventos com as relações populadas
    const events = await Event.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Enriquecer os dados com informações relacionadas
    const enrichedEvents = [];
    
    for (const event of events) {
      const account = event.accountId ? await Account.findById(event.accountId).lean() : null;
      const campaign = event.campaignId ? await Campaign.findById(event.campaignId).lean() : null;
      const email = event.emailId ? await Email.findById(event.emailId).lean() : null;
      
      enrichedEvents.push({
        _id: event._id,
        eventType: event.eventType,
        timestamp: event.timestamp,
        accountName: account ? account.name : 'N/A',
        accountProvider: account ? account.provider : 'N/A',
        campaignName: campaign ? campaign.name : 'N/A',
        contactEmail: event.contactEmail || 'N/A',
        emailSubject: email ? email.subject : 'N/A'
      });
    }
    
    return responseUtils.success(res, enrichedEvents);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  compareMetrics,
  getMetricsSummary,
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

// Importar módulo de comparação de métricas e utilitário de filtro
const compareMetricsController = require('./compareMetricsController');
const filterUtil = require('../utils/filterUtil');

// Método para comparar métricas entre múltiplos itens
const compareMetrics = compareMetricsController.compareMetrics;

// Método atualizado para obter eventos com suporte a múltiplos IDs
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
