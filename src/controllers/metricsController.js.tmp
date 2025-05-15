const mongoose = require("mongoose");
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
    
    // Formatar resposta
    const formattedMetrics = metrics.map(metric => {
      const result = {
        date: metric.date,
        metrics: metric.metrics
      };
      
      if (metric.account) {
        result.account = {
          id: metric.account._id,
          name: metric.account.name,
          provider: metric.account.provider
        };
      }
      
      if (metric.campaign) {
        result.campaign = {
          id: metric.campaign._id,
          name: metric.campaign.name
        };
      }
      
      return result;
    });
    
    return responseUtils.success(res, formattedMetrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter métricas por conta
const getMetricsByAccount = async (req, res) => {
  // Implementação da função
  // ...
};

// Obter métricas por campanha
const getMetricsByCampaign = async (req, res) => {
  // Implementação da função
  // ...
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
      try {
        // Verificar se a campanha é válida
        let campaign;
        
        // Tentar encontrar pelo campaignID numérico primeiro
        campaign = await Campaign.findOne({ campaignID: Number(campaignId) });
        
        // Se não encontrar pelo campaignID, tentar pelo ObjectId ou externalId
        if (!campaign) {
          if (mongoose.Types.ObjectId.isValid(campaignId)) {
            campaign = await Campaign.findOne({ _id: campaignId });
          } else {
            // Se não for um ObjectId válido, buscar por externalId
            campaign = await Campaign.findOne({ externalId: campaignId });
          }
        }
        
        if (!campaign) {
          return responseUtils.error(res, "Campanha não encontrada");
        }
        
        // Usar o ObjectId da campanha para relacionamentos internos
        emailFilter.campaign = campaign._id;
      } catch (error) {
        console.error("Erro ao buscar campanha:", error);
        return responseUtils.error(res, "Erro ao processar ID da campanha: " + error.message);
      }
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
        const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
        
        // Taxa de abertura única (baseada em aberturas únicas)
        const uniqueOpenRate = sentCount > 0 ? (uniqueOpenCount / sentCount) * 100 : 0;
        
        // Taxa de clique total (baseada em todos os cliques)
        const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
        
        // Taxa de clique única (baseada em cliques únicos)
        const uniqueClickRate = sentCount > 0 ? (uniqueClickCount / sentCount) * 100 : 0;
        
        const clickToOpenRate = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
        const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
        
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
  // Implementação da função
  // ...
};

// Obter data do último envio
const getLastSendDate = async (req, res) => {
  // Implementação da função
  // ...
};

// Obter taxas gerais
const getRates = async (req, res) => {
  // Implementação da função
  // ...
};

// Obter taxa de envio
const getSendRate = async (req, res) => {
  // Implementação da função
  // ...
};

// Obter envios diários
const getDailySends = async (req, res) => {
  // Implementação da função
  // ...
};

// Obter aberturas diárias
const getDailyOpens = async (req, res) => {
  // Implementação da função
  // ...
};

// Obter cliques diários
const getDailyClicks = async (req, res) => {
  // Implementação da função
  // ...
};

// Obter eventos
const getEvents = async (req, res) => {
  // Implementação da função
  // ...
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
