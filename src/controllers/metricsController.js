const { Metrics, Account, Campaign, Event } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

// Obter métricas por data
const getMetricsByDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, groupBy = 'day' } = req.query;
    
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
      userId // Filtrar pelo userId
    };
    
    if (accountId) {
      // Verificar se a conta pertence ao usuário
      const account = await Account.findOne({ _id: accountId, userId });
      
      if (!account) {
        return responseUtils.error(res, 'Conta não encontrada ou não pertence ao usuário');
      }
      
      filter.account = accountId;
    }
    
    if (campaignId) {
      // Verificar se a campanha pertence ao usuário
      const campaign = await Campaign.findOne({ _id: campaignId });
      
      if (!campaign) {
        return responseUtils.error(res, 'Campanha não encontrada');
      }
      
      // Verificar se a conta da campanha pertence ao usuário
      const account = await Account.findOne({ _id: campaign.account, userId });
      
      if (!account) {
        return responseUtils.error(res, 'Campanha não pertence ao usuário');
      }
      
      filter.campaign = campaignId;
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
    const { startDate, endDate, campaignId } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Buscar contas do usuário
    const accounts = await Account.find({ userId }).select('_id name provider');
    
    // Para cada conta, buscamos suas métricas agregadas
    const accountMetrics = await Promise.all(
      accounts.map(async (account) => {
        // Construir filtro de métricas
        const filter = {
          account: account._id,
          date: { $gte: start, $lte: end },
          period: 'day',
          userId // Filtrar pelo userId
        };
        
        if (campaignId) {
          filter.campaign = campaignId;
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
    const { startDate, endDate, accountId } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Filtro para campanhas
    const campaignFilter = { userId };
    if (accountId) {
      // Verificar se a conta pertence ao usuário
      const account = await Account.findOne({ _id: accountId, userId });
      
      if (!account) {
        return responseUtils.error(res, 'Conta não encontrada ou não pertence ao usuário');
      }
      
      campaignFilter.account = accountId;
    }
    
    // Buscar campanhas do usuário
    const campaigns = await Campaign.find(campaignFilter).select('_id name account');
    
    // Para cada campanha, buscamos suas métricas agregadas
    const campaignMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        // Construir filtro de métricas
        const filter = {
          campaign: campaign._id,
          date: { $gte: start, $lte: end },
          period: 'day',
          userId
        };
        
        // Buscar métricas desta campanha
        const metrics = await Metrics.find(filter);
        
        // Agregação das métricas para esta campanha
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
        
        // Buscar conta associada
        const account = await Account.findById(campaign.account).select('name provider');
        
        return {
          campaign: {
            id: campaign._id,
            name: campaign.name
          },
          account: {
            id: account._id,
            name: account.name,
            provider: account.provider
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

// Obter emails abertos
const getOpenedEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, includeUnique = 'true' } = req.query;
    
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
    
    if (accountId) {
      baseFilter.account = accountId;
    }
    
    if (campaignId) {
      baseFilter.campaign = campaignId;
    }
    
    // Contar aberturas totais
    const totalOpens = await Event.countDocuments(baseFilter);
    
    // Contar aberturas únicas
    const uniqueOpens = await Event.countDocuments({
      ...baseFilter,
      isFirstInteraction: true
    });
    
    // Buscar emails enviados para calcular taxas
    const deliveredFilter = {
      ...baseFilter,
      eventType: 'delivery'
    };
    delete deliveredFilter.eventType;
    deliveredFilter.eventType = 'delivery';
    
    const deliveredCount = await Event.countDocuments(deliveredFilter);
    
    // Calcular taxa de abertura (com base em aberturas únicas)
    const openRate = deliveredCount > 0 ? (uniqueOpens / deliveredCount) * 100 : 0;
    
    // Buscar emails recentemente abertos (limitado a 50)
    const recentOpens = await Event.find(baseFilter)
      .select('contactEmail timestamp isFirstInteraction campaign email')
      .populate('campaign', 'name')
      .populate('email', 'subject')
      .sort({ timestamp: -1 })
      .limit(50);
    
    // Formatar os dados para resposta
    const formattedRecentOpens = recentOpens.map(open => ({
      id: open._id,
      contactEmail: open.contactEmail,
      timestamp: open.timestamp,
      isUnique: open.isFirstInteraction,
      campaign: open.campaign ? open.campaign.name : 'Desconhecida',
      subject: open.email ? open.email.subject : 'Desconhecido'
    }));
    
    return responseUtils.success(res, {
      metrics: {
        totalOpens,
        uniqueOpens,
        deliveredCount,
        openRate
      },
      recentOpens: formattedRecentOpens
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter data do último envio
const getLastSendDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountId } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Construir filtro
    const filter = {
      userId,
      eventType: 'send'
    };
    
    if (accountId) {
      filter.account = accountId;
    }
    
    // Buscar o evento de envio mais recente
    const lastSendEvent = await Event.findOne(filter)
      .sort({ timestamp: -1 })
      .select('timestamp campaign')
      .populate('campaign', 'name');
    
    if (!lastSendEvent) {
      return responseUtils.success(res, { lastSend: null });
    }
    
    return responseUtils.success(res, {
      lastSend: {
        date: lastSendEvent.timestamp,
        campaign: lastSendEvent.campaign ? {
          id: lastSendEvent.campaign._id,
          name: lastSendEvent.campaign.name
        } : null
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter taxas (CTR, bounce, unsubscribe)
const getRates = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, period = 'day' } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Validar o parâmetro period
    if (!['day', 'week', 'month'].includes(period)) {
      return responseUtils.error(res, 'O parâmetro period deve ser day, week ou month');
    }
    
    // Construir filtro
    const filter = {
      userId,
      date: { $gte: start, $lte: end },
      period
    };
    
    if (accountId) {
      filter.account = accountId;
    }
    
    if (campaignId) {
      filter.campaign = campaignId;
    }
    
    // Buscar métricas
    const metrics = await Metrics.find(filter)
      .sort({ date: 1 })
      .select('date metrics');
    
    // Formatar dados para gráficos
    const labels = metrics.map(m => {
      const date = new Date(m.date);
      if (period === 'day') {
        return date.toLocaleDateString();
      } else if (period === 'week') {
        return `Semana ${Math.ceil(date.getDate() / 7)} de ${date.toLocaleDateString('pt-BR', { month: 'short' })}`;
      } else if (period === 'month') {
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      }
    });
    
    const clickToOpenRates = metrics.map(m => m.metrics.clickToOpenRate || 0);
    const bounceRates = metrics.map(m => m.metrics.bounceRate || 0);
    const unsubscribeRates = metrics.map(m => m.metrics.unsubscribeRate || 0);
    
    return responseUtils.success(res, {
      labels,
      datasets: [
        {
          label: 'CTR (Click-to-Open Rate)',
          data: clickToOpenRates
        },
        {
          label: 'Taxa de Bounce',
          data: bounceRates
        },
        {
          label: 'Taxa de Unsubscribe',
          data: unsubscribeRates
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
    const { startDate, endDate } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Buscar contas do usuário
    const accounts = await Account.find({ userId }).select('_id name provider');
    
    // Dados para o gráfico
    const labels = accounts.map(a => a.name);
    const sendCounts = [];
    
    // Para cada conta, buscamos a quantidade de envios
    for (const account of accounts) {
      const sentCount = await Event.countDocuments({
        userId,
        account: account._id,
        eventType: 'send',
        timestamp: { $gte: start, $lte: end }
      });
      
      sendCounts.push(sentCount);
    }
    
    return responseUtils.success(res, {
      labels,
      datasets: [
        {
          label: 'Emails Enviados',
          data: sendCounts
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
    const { startDate, endDate, accountId, campaignId } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro
    const baseFilter = {
      userId,
      eventType: 'send',
      timestamp: { $gte: start, $lte: end }
    };
    
    if (accountId) {
      baseFilter.account = accountId;
    }
    
    if (campaignId) {
      baseFilter.campaign = campaignId;
    }
    
    // Agrupar envios por dia
    const dailySends = await Event.aggregate([
      { $match: baseFilter },
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
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Formatar dados para gráfico
    const labels = [];
    const data = [];
    
    // Preencher dados para cada dia no intervalo
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      
      // Buscar se há envios para este dia
      const dayData = dailySends.find(d => 
        d._id.year === year && d._id.month === month && d._id.day === day
      );
      
      labels.push(currentDate.toLocaleDateString());
      data.push(dayData ? dayData.count : 0);
      
      // Avançar para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
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

// Obter aberturas diárias
const getDailyOpens = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, uniqueOnly = 'false' } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro
    const baseFilter = {
      userId,
      eventType: 'open',
      timestamp: { $gte: start, $lte: end }
    };
    
    if (accountId) {
      baseFilter.account = accountId;
    }
    
    if (campaignId) {
      baseFilter.campaign = campaignId;
    }
    
    // Se solicitado apenas aberturas únicas
    if (uniqueOnly === 'true') {
      baseFilter.isFirstInteraction = true;
    }
    
    // Agrupar aberturas por dia
    const dailyOpens = await Event.aggregate([
      { $match: baseFilter },
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
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Formatar dados para gráfico
    const labels = [];
    const data = [];
    
    // Preencher dados para cada dia no intervalo
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      
      // Buscar se há aberturas para este dia
      const dayData = dailyOpens.find(d => 
        d._id.year === year && d._id.month === month && d._id.day === day
      );
      
      labels.push(currentDate.toLocaleDateString());
      data.push(dayData ? dayData.count : 0);
      
      // Avançar para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const labelPrefix = uniqueOnly === 'true' ? 'Aberturas Únicas' : 'Aberturas Totais';
    
    return responseUtils.success(res, {
      labels,
      datasets: [
        {
          label: labelPrefix,
          data
        }
      ]
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter cliques diários
const getDailyClicks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, uniqueOnly = 'false' } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Construir filtro
    const baseFilter = {
      userId,
      eventType: 'click',
      timestamp: { $gte: start, $lte: end }
    };
    
    if (accountId) {
      baseFilter.account = accountId;
    }
    
    if (campaignId) {
      baseFilter.campaign = campaignId;
    }
    
    // Se solicitado apenas cliques únicos
    if (uniqueOnly === 'true') {
      baseFilter.isFirstInteraction = true;
    }
    
    // Agrupar cliques por dia
    const dailyClicks = await Event.aggregate([
      { $match: baseFilter },
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
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Formatar dados para gráfico
    const labels = [];
    const data = [];
    
    // Preencher dados para cada dia no intervalo
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      
      // Buscar se há cliques para este dia
      const dayData = dailyClicks.find(d => 
        d._id.year === year && d._id.month === month && d._id.day === day
      );
      
      labels.push(currentDate.toLocaleDateString());
      data.push(dayData ? dayData.count : 0);
      
      // Avançar para o próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const labelPrefix = uniqueOnly === 'true' ? 'Cliques Únicos' : 'Cliques Totais';
    
    return responseUtils.success(res, {
      labels,
      datasets: [
        {
          label: labelPrefix,
          data
        }
      ]
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  getMetricsByDate,
  getMetricsByAccount,
  getMetricsByCampaign,
  getOpenedEmails,
  getLastSendDate,
  getRates,
  getSendRate,
  getDailySends,
  getDailyOpens,
  getDailyClicks
};
