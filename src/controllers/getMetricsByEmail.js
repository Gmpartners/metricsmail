const { Metrics, Account, Email, Event } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

const getMetricsByEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
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
    let emailFilter = { userId };
    
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        emailFilter.account = { $in: accountIdArray };
      }
    }
    
    if (emailIds) {
      const emailIdArray = emailIds.split(',').filter(id => id.trim());
      if (emailIdArray.length > 0) {
        emailFilter._id = { $in: emailIdArray };
      }
    }
    
    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    
    // Buscar emails com paginação e informações relacionadas
    const emails = await Email.find(emailFilter)
      .populate('account', 'name provider')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    
    // Contar total para paginação
    const totalEmails = await Email.countDocuments(emailFilter);
    
    // Para cada email, buscar suas métricas específicas
    const emailsWithMetrics = await Promise.all(
      emails.map(async (email) => {
        // Calcular métricas direto dos eventos deste email no período
        const eventFilter = {
          email: email._id,
          timestamp: { $gte: start, $lte: end },
          userId
        };
        
        const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
        const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
        const uniqueOpenCount = await Event.countDocuments({ ...eventFilter, eventType: 'open', isFirstInteraction: true });
        const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
        const uniqueClickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click', isFirstInteraction: true });
        const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
        const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
        
        // Calcular taxas
        const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
        const uniqueOpenRate = sentCount > 0 ? (uniqueOpenCount / sentCount) * 100 : 0;
        const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
        const uniqueClickRate = sentCount > 0 ? (uniqueClickCount / sentCount) * 100 : 0;
        const clickToOpenRate = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
        const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
        
        return {
          emailId: email._id.toString(),
          subject: email.subject,
          name: email.name,
          createdAt: email.createdAt,
          fromName: email.fromName,
          fromEmail: email.fromEmail,
          account: email.account ? {
            id: email.account._id,
            name: email.account.name,
            provider: email.account.provider,
            accountId: email.account._id.toString()
          } : null,
          metrics: {
            sentCount,
            openCount,
            uniqueOpenCount,
            clickCount,
            uniqueClickCount,
            bounceCount,
            unsubscribeCount,
            openRate,
            uniqueOpenRate,
            clickRate,
            uniqueClickRate,
            clickToOpenRate,
            bounceRate,
            unsubscribeRate
          }
        };
      })
    );
    
    return responseUtils.success(res, {
      emails: emailsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: pageSize,
        total: totalEmails,
        pages: Math.ceil(totalEmails / pageSize)
      },
      period: {
        startDate: start,
        endDate: end
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = getMetricsByEmail;
