const { Metrics, Account, Campaign, Event, Email } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

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
    const { startDate, endDate, campaignId, emailId, emailIds } = req.query;
    
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
    const { startDate, endDate, accountId, emailId, emailIds } = req.query;
    
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

// Obter métricas por email
const getMetricsByEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Filtro para emails
    const emailFilter = { userId };
    
    if (accountId) {
      // Verificar se a conta pertence ao usuário
      const account = await Account.findOne({ _id: accountId, userId });
      
      if (!account) {
        return responseUtils.error(res, 'Conta não encontrada ou não pertence ao usuário');
      }
      
      emailFilter.account = accountId;
    }
    
    if (campaignId) {
      // Verificar se a campanha é válida
      const campaign = await Campaign.findOne({ _id: campaignId });
      
      if (!campaign) {
        return responseUtils.error(res, 'Campanha não encontrada');
      }
      
      emailFilter.campaign = campaignId;
    }
    
    // Buscar emails do usuário
    const emails = await Email.find(emailFilter).select('_id subject fromName account campaign');
    
    // Para cada email, buscar seus eventos e calcular as métricas
    const emailMetrics = await Promise.all(
      emails.map(async (email) => {
        const eventFilter = {
          userId,
          email: email._id,
          timestamp: { $gte: start, $lte: end }
        };
        
        // Contagens de eventos
        const sentCount = await Event.countDocuments({...eventFilter, eventType: 'send'});
        const deliveredCount = await Event.countDocuments({...eventFilter, eventType: 'delivery'});
        const openCount = await Event.countDocuments({...eventFilter, eventType: 'open'});
        const uniqueOpenCount = await Event.countDocuments({...eventFilter, eventType: 'open', isFirstInteraction: true});
        const clickCount = await Event.countDocuments({...eventFilter, eventType: 'click'});
        const uniqueClickCount = await Event.countDocuments({...eventFilter, eventType: 'click', isFirstInteraction: true});
        const bounceCount = await Event.countDocuments({...eventFilter, eventType: 'bounce'});
        const unsubscribeCount = await Event.countDocuments({...eventFilter, eventType: 'unsubscribe'});
        
        // Cálculo de taxas - CORREÇÃO AQUI
        const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0;
        
        // Taxa de abertura total (baseada em todas as aberturas)
        const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
        
        // Taxa de abertura única (baseada em aberturas únicas)
        const uniqueOpenRate = deliveredCount > 0 ? (uniqueOpenCount / deliveredCount) * 100 : 0;
        
        // Taxa de clique total (baseada em todos os cliques)
        const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
        
        // Taxa de clique única (baseada em cliques únicos)
        const uniqueClickRate = deliveredCount > 0 ? (uniqueClickCount / deliveredCount) * 100 : 0;
        
        const clickToOpenRate = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
        const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
        
        // Buscar conta e campanha associadas
        const account = await Account.findById(email.account).select('name provider');
        const campaign = await Campaign.findById(email.campaign).select('name');
        
        return {
          email: {
            id: email._id,
            subject: email.subject,
            fromName: email.fromName
          },
          campaign: {
            id: campaign._id,
            name: campaign.name
          },
          account: {
            id: account._id,
            name: account.name,
            provider: account.provider
          },
          metrics: {
            sentCount,
            deliveredCount,
            openCount,
            uniqueOpenCount,
            clickCount,
            uniqueClickCount,
            bounceCount,
            unsubscribeCount,
            deliveryRate,
            openRate,           // Taxa baseada em aberturas TOTAIS
            uniqueOpenRate,     // NOVA taxa baseada em aberturas ÚNICAS
            clickRate,          // Taxa baseada em cliques TOTAIS
            uniqueClickRate,    // NOVA taxa baseada em cliques ÚNICOS
            clickToOpenRate,
            bounceRate,
            unsubscribeRate
          }
        };
      })
    );
    
    return responseUtils.success(res, emailMetrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter emails abertos
const getOpenedEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, includeUnique = 'true' } = req.query;
    
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
    
    // Processar filtro de emails
    if (emailId) {
      baseFilter.email = emailId;
    } else if (emailIds) {
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : emailIds.split(',');
      baseFilter.email = { $in: emailIdsArray };
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
    
    // Calcular taxa de abertura TOTAL (baseada em todas as aberturas)
    const openRate = deliveredCount > 0 ? (totalOpens / deliveredCount) * 100 : 0;
    
    // Calcular taxa de abertura ÚNICA (baseada em aberturas únicas)
    const uniqueOpenRate = deliveredCount > 0 ? (uniqueOpens / deliveredCount) * 100 : 0;
    
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
        openRate,           // Taxa baseada em aberturas TOTAIS
        uniqueOpenRate      // NOVA taxa baseada em aberturas ÚNICAS
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
    const { accountId, campaignId, emailId, emailIds } = req.query;
    
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
    
    if (campaignId) {
      filter.campaign = campaignId;
    }
    
    // Processar filtro de emails
    if (emailId) {
      filter.email = emailId;
    } else if (emailIds) {
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : emailIds.split(',');
      filter.email = { $in: emailIdsArray };
    }
    
    // Buscar o evento de envio mais recente
    const lastSendEvent = await Event.findOne(filter)
      .sort({ timestamp: -1 })
      .select('timestamp campaign email')
      .populate('campaign', 'name')
      .populate('email', 'subject');
    
    if (!lastSendEvent) {
      return responseUtils.success(res, { lastSend: null });
    }
    
    return responseUtils.success(res, {
      lastSend: {
        date: lastSendEvent.timestamp,
        campaign: lastSendEvent.campaign ? {
          id: lastSendEvent.campaign._id,
          name: lastSendEvent.campaign.name
        } : null,
        email: lastSendEvent.email ? {
          id: lastSendEvent.email._id,
          subject: lastSendEvent.email.subject
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
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, period = 'day' } = req.query;
    
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
    
    // Se temos filtragem por emails específicos, precisamos calcular as taxas diretamente dos eventos
    if (emailId || emailIds) {
      // Transformar emailIds em array
      const emailIdsArray = emailIds ? (Array.isArray(emailIds) ? emailIds : emailIds.split(',')) : [];
      const emailFilter = emailId ? emailId : { $in: emailIdsArray };
      
      // Preparar o filtro base para eventos
      const baseFilter = {
        userId,
        timestamp: { $gte: start, $lte: end }
      };
      
      if (accountId) {
        baseFilter.account = accountId;
      }
      
      if (campaignId) {
        baseFilter.campaign = campaignId;
      }
      
      if (emailId || emailIds) {
        baseFilter.email = emailFilter;
      }
      
      // Agrupar eventos por dia
      const groupedEvents = await Event.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: {
              date: { 
                $dateToString: { 
                  format: period === 'day' ? '%Y-%m-%d' : 
                           period === 'week' ? '%Y-%U' : '%Y-%m',
                  date: '$timestamp'
                }
              },
              eventType: '$eventType',
              isFirstInteraction: '$isFirstInteraction'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);
      
      // Estruturar os dados agrupados
      const dateStats = {};
      
      // Inicializar as estruturas de dados
      groupedEvents.forEach(event => {
        const dateKey = event._id.date;
        if (!dateStats[dateKey]) {
          dateStats[dateKey] = {
            opens: 0,
            uniqueOpens: 0,
            clicks: 0,
            uniqueClicks: 0,
            sends: 0,
            deliveries: 0,
            bounces: 0,
            unsubscribes: 0
          };
        }
        
        // Contar eventos por tipo
        const eventType = event._id.eventType;
        const isFirstInteraction = event._id.isFirstInteraction;
        
        if (eventType === 'open') {
          dateStats[dateKey].opens += event.count;
          if (isFirstInteraction) {
            dateStats[dateKey].uniqueOpens += event.count;
          }
        } else if (eventType === 'click') {
          dateStats[dateKey].clicks += event.count;
          if (isFirstInteraction) {
            dateStats[dateKey].uniqueClicks += event.count;
          }
        } else if (eventType === 'send') {
          dateStats[dateKey].sends += event.count;
        } else if (eventType === 'delivery') {
          dateStats[dateKey].deliveries += event.count;
        } else if (eventType === 'bounce') {
          dateStats[dateKey].bounces += event.count;
        } else if (eventType === 'unsubscribe') {
          dateStats[dateKey].unsubscribes += event.count;
        }
      });
      
      // Calcular taxas para cada período
      const labels = Object.keys(dateStats).sort();
      const clickToOpenRates = [];
      const bounceRates = [];
      const unsubscribeRates = [];
      
      labels.forEach(dateKey => {
        const stats = dateStats[dateKey];
        // Click-to-Open Rate (cliques únicos / aberturas únicas)
        const ctr = stats.uniqueOpens > 0 ? (stats.uniqueClicks / stats.uniqueOpens) * 100 : 0;
        clickToOpenRates.push(ctr);
        
        // Bounce Rate (bounces / envios)
        const br = stats.sends > 0 ? (stats.bounces / stats.sends) * 100 : 0;
        bounceRates.push(br);
        
        // Unsubscribe Rate (cancelamentos / entregas)
        const ur = stats.deliveries > 0 ? (stats.unsubscribes / stats.deliveries) * 100 : 0;
        unsubscribeRates.push(ur);
      });
      
      // Formatar as labels de acordo com o período
      const formattedLabels = labels.map(dateStr => {
        if (period === 'day') {
          return new Date(dateStr).toLocaleDateString();
        } else if (period === 'week') {
          // Formato YYYY-WW
          const [year, week] = dateStr.split('-');
          return `Semana ${week} de ${year}`;
        } else if (period === 'month') {
          // Formato YYYY-MM
          const date = new Date(dateStr + '-01'); // Adicionar dia para criar um objeto Date válido
          return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }
        return dateStr;
      });
      
      return responseUtils.success(res, {
        labels: formattedLabels,
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
    } else {
      // Usar a abordagem original baseada em métricas agregadas quando não filtramos por email
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
    }
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
    
    // Buscar contas do usuário
    const accounts = await Account.find({ userId }).select('_id name provider');
    
    // Construir filtro base
    const baseFilter = {
      userId,
      eventType: 'send',
      timestamp: { $gte: start, $lte: end }
    };
    
    if (campaignId) {
      baseFilter.campaign = campaignId;
    }
    
    // Processar filtro de emails
    if (emailId) {
      baseFilter.email = emailId;
    } else if (emailIds) {
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : emailIds.split(',');
      baseFilter.email = { $in: emailIdsArray };
    }
    
    // Dados para o gráfico
    const labels = accounts.map(a => a.name);
    const sendCounts = [];
    
    // Para cada conta, buscamos a quantidade de envios
    for (const account of accounts) {
      const sentCount = await Event.countDocuments({
        ...baseFilter,
        account: account._id
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
    const { startDate, endDate, accountId, campaignId, emailId, emailIds } = req.query;
    
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
    
    // Processar filtro de emails
    if (emailId) {
      baseFilter.email = emailId;
    } else if (emailIds) {
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : emailIds.split(',');
      baseFilter.email = { $in: emailIdsArray };
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
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, uniqueOnly = 'false' } = req.query;
    
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
    
    // Processar filtro de emails
    if (emailId) {
      baseFilter.email = emailId;
    } else if (emailIds) {
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : emailIds.split(',');
      baseFilter.email = { $in: emailIdsArray };
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
    const { startDate, endDate, accountId, campaignId, emailId, emailIds, uniqueOnly = 'false' } = req.query;
    
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
    
    // Processar filtro de emails
    if (emailId) {
      baseFilter.email = emailId;
    } else if (emailIds) {
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : emailIds.split(',');
      baseFilter.email = { $in: emailIdsArray };
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

// Obter eventos recentes filtrados
const getEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, accountId, campaignId, emailId, emailIds, eventType } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const filter = { userId };
    
    // Aplicar filtros adicionais
    if (accountId) {
      filter.account = accountId;
    }
    
    if (campaignId) {
      filter.campaign = campaignId;
    }
    
    // Processar filtro de emails
    if (emailId) {
      filter.email = emailId;
    } else if (emailIds) {
      const emailIdsArray = Array.isArray(emailIds) ? emailIds : emailIds.split(',');
      filter.email = { $in: emailIdsArray };
    }
    
    // Filtrar por tipo de evento
    if (eventType) {
      filter.eventType = eventType;
    }
    
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
      accountName: event.account ? event.account.name : 'Desconhecida',
      accountProvider: event.account ? event.account.provider : 'Desconhecido',
      campaignName: event.campaign ? event.campaign.name : 'Desconhecida',
      contactEmail: event.contactEmail,
      emailSubject: event.email ? event.email.subject : 'Desconhecido'
    }));
    
    return responseUtils.success(res, formattedEvents);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
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
