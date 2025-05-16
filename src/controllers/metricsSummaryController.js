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
    
    // Contar eventos únicos (usando contactEmail para contar contatos únicos)
    const uniqueOpeners = await Event.distinct('contactEmail', { userId, eventType: 'open' });
    const uniqueClickers = await Event.distinct('contactEmail', { userId, eventType: 'click' });
    
    const uniqueOpenCount = uniqueOpeners.length;
    const uniqueClickCount = uniqueClickers.length;
    
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
    
    // Obter contas do usuário (até 5)
    const accounts = await Account.find({ userId })
      .select('_id name provider status')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Obter últimos emails (até 5)
    const recentEmails = await Email.find({ userId })
      .select('_id subject fromName account campaign sentDate metrics')
      .populate('account', 'name provider')
      .populate('campaign', 'name')
      .sort({ sentDate: -1 })
      .limit(5);
    
    // Formatar emails recentes para incluir o nome da conta
    const formattedEmails = recentEmails.map(email => {
      const emailObj = email.toObject();
      emailObj.accountName = email.account ? email.account.name : 'Conta Desconhecida';
      return emailObj;
    });
    
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
        bounceRate,
        unsubscribeRate,
        ctr,
        uniqueCtr
      },
      accounts,
      recentEmails: formattedEmails
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  getMetricsSummary
};
