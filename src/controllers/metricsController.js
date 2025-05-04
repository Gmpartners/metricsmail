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

// Implementação simplificada dos demais métodos
// Você precisará adaptar os outros métodos da mesma forma, adicionando
// o filtro de userId e as verificações de permissão

// Obter métricas por campanha
const getMetricsByCampaign = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId } = req.query;
    
    // Implementação com verificação de userId e permissões...
    // Semelhante ao método getMetricsByAccount
    
    return responseUtils.success(res, []); // Placeholder para implementação completa
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter emails abertos
const getOpenedEmails = async (req, res) => {
  try {
    const { userId } = req.params;
    // Implementação com verificação de userId e permissões...
    
    return responseUtils.success(res, []); // Placeholder para implementação completa
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter data do último envio
const getLastSendDate = async (req, res) => {
  try {
    const { userId } = req.params;
    // Implementação com verificação de userId e permissões...
    
    return responseUtils.success(res, { lastSend: null }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter taxas (CTR, bounce, unsubscribe)
const getRates = async (req, res) => {
  try {
    const { userId } = req.params;
    // Implementação com verificação de userId e permissões...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter taxa de envio por conta
const getSendRate = async (req, res) => {
  try {
    const { userId } = req.params;
    // Implementação com verificação de userId e permissões...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter envios diários
const getDailySends = async (req, res) => {
  try {
    const { userId } = req.params;
    // Implementação com verificação de userId e permissões...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter aberturas diárias
const getDailyOpens = async (req, res) => {
  try {
    const { userId } = req.params;
    // Implementação com verificação de userId e permissões...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter cliques diários
const getDailyClicks = async (req, res) => {
  try {
    const { userId } = req.params;
    // Implementação com verificação de userId e permissões...
    
    return responseUtils.success(res, { labels: [], datasets: [] }); // Placeholder
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