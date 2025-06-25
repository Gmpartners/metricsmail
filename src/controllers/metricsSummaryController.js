const { Metrics, Account, Event, Email } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

// Obter resumo geral de métricas
const getMetricsSummary = async (req, res) => {
  try {
    const { userId } = req.params;
<<<<<<< HEAD
    const { startDate, endDate, accountIds } = req.query;
=======
>>>>>>> 8a3fee211a1f68c0942aae00b3498b11a4eff1bf
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
<<<<<<< HEAD
    // Criar filtros base
    const eventFilter = { userId };
    const emailFilter = { userId };
    
    // Adicionar filtro de data se fornecido
    if (startDate && endDate) {
      eventFilter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Adicionar filtro de conta se fornecido
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        eventFilter.account = { $in: accountIdArray };
        emailFilter.account = { $in: accountIdArray };
      }
    }
    
    // Obter estatísticas gerais de emails
    const emailCount = await Email.countDocuments(emailFilter);
    const eventCount = await Event.countDocuments(eventFilter);
    
    // Contar eventos por tipo
    const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
    const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
    const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
    const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
    const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
    
    // Contar eventos únicos (usando contactEmail para contar contatos únicos)
    const uniqueOpeners = await Event.distinct('contactEmail', { ...eventFilter, eventType: 'open' });
    const uniqueClickers = await Event.distinct('contactEmail', { ...eventFilter, eventType: 'click' });
=======
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
>>>>>>> 8a3fee211a1f68c0942aae00b3498b11a4eff1bf
    
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
    
<<<<<<< HEAD
    // Obter últimos emails (até 5) com filtros aplicados
    const recentEmailsQuery = { userId };
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        recentEmailsQuery.account = { $in: accountIdArray };
      }
    }
    
    const recentEmails = await Email.find(recentEmailsQuery)
=======
    // Obter últimos emails (até 5)
    const recentEmails = await Email.find({ userId })
>>>>>>> 8a3fee211a1f68c0942aae00b3498b11a4eff1bf
      .populate('account', 'name provider')
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
