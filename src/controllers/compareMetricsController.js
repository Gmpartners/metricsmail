const mongoose = require('mongoose');
const { Metrics, Account, Event, Email } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

/**
 * Compara métricas entre contas ou emails (SEM campanhas)
 */
const compareMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      emailIds, 
      compareType = 'accounts' 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar o tipo de comparação (removido campaigns)
    const validCompareTypes = ['accounts', 'emails'];
    if (!validCompareTypes.includes(compareType)) {
      return responseUtils.error(res, `Tipo de comparação inválido. Use: ${validCompareTypes.join(', ')}`);
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    let comparisonResults = [];
    
    switch (compareType) {
      case 'accounts':
        if (!accountIds) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos uma conta para comparação');
        }
        
        const accountIdArray = accountIds.split(',').filter(id => id.trim());
        const accounts = await Account.find({ 
          _id: { $in: accountIdArray },
          userId 
        });
        
        if (accounts.length === 0) {
          return responseUtils.error(res, 'Nenhuma conta válida encontrada');
        }
        
        comparisonResults = await Promise.all(
          accounts.map(async (account) => {
            const eventFilter = {
              userId,
              account: account._id,
              timestamp: { $gte: start, $lte: end }
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
              id: account._id,
              accountId: account._id.toString(),
              name: account.name,
              provider: account.provider,
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
        break;
        
      case 'emails':
        if (!emailIds) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos um email para comparação');
        }
        
        const emailIdArray = emailIds.split(',').filter(id => id.trim());
        const emails = await Email.find({ 
          _id: { $in: emailIdArray },
          userId
        }).populate('account', 'name provider');
        
        if (emails.length === 0) {
          return responseUtils.error(res, 'Nenhum email válido encontrado para o usuário');
        }
        
        comparisonResults = await Promise.all(
          emails.map(async (email) => {
            const eventFilter = {
              userId,
              email: email._id,
              timestamp: { $gte: start, $lte: end }
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
              id: email._id,
              emailId: email._id.toString(),
              subject: email.subject,
              name: email.name,
              createdAt: email.createdAt,
              account: email.account ? {
                id: email.account._id,
                accountId: email.account._id.toString(),
                name: email.account.name,
                provider: email.account.provider
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
        break;
    }
    
    // Calcular melhor performance baseado na taxa de abertura
    let bestPerformer = null;
    if (comparisonResults.length > 0) {
      const sorted = comparisonResults.sort((a, b) => b.metrics.openRate - a.metrics.openRate);
      bestPerformer = {
        id: sorted[0].id,
        name: sorted[0].name || sorted[0].subject,
        ...(compareType === 'accounts' && { accountId: sorted[0].accountId }),
        ...(compareType === 'emails' && { emailId: sorted[0].emailId }),
        metrics: {
          openRate: sorted[0].metrics.openRate,
          clickRate: sorted[0].metrics.clickRate,
          clickToOpenRate: sorted[0].metrics.clickToOpenRate
        }
      };
    }
    
    return responseUtils.success(res, {
      compareType,
      period: { startDate: start, endDate: end },
      results: comparisonResults,
      bestPerformer
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  compareMetrics
};
