const mongoose = require("mongoose");
const { Metrics, Account, Event, Email } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

const getMetricsByDate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      emailIds, 
      groupBy = 'day' 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Usar as datas exatamente como recebidas do frontend
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    
    if (!['day', 'week', 'month', 'year'].includes(groupBy)) {
      return responseUtils.error(res, 'O parâmetro groupBy deve ser day, week, month ou year');
    }
    
    let accountFilter = { userId };
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        accountFilter._id = { $in: accountIdArray };
      }
    }
    
    const accounts = await Account.find(accountFilter);
    
    if (accounts.length === 0) {
      return responseUtils.error(res, 'Nenhuma conta válida encontrada para o usuário');
    }
    
    const metrics = [];
    const currentDate = new Date(start);
    const today = new Date();
    
    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daysDiff = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
      const isRealTime = daysDiff <= 2;
      
      for (const account of accounts) {
        const eventFilter = {
          userId,
          account: account._id,
          timestamp: { $gte: dayStart, $lte: dayEnd }
        };
        
        if (emailIds) {
          const emailIdArray = emailIds.split(',').filter(id => id.trim());
          if (emailIdArray.length > 0) {
            eventFilter.email = { $in: emailIdArray };
          }
        }
        
        const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
        const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
        const uniqueOpenCount = await Event.countDocuments({ ...eventFilter, eventType: 'open', isFirstInteraction: true });
        const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
        const uniqueClickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click', isFirstInteraction: true });
        const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
        const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
        
        const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
        const uniqueOpenRate = sentCount > 0 ? (uniqueOpenCount / sentCount) * 100 : 0;
        const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
        const uniqueClickRate = sentCount > 0 ? (uniqueClickCount / sentCount) * 100 : 0;
        const clickToOpenRate = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
        const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
        
        if (sentCount > 0 || openCount > 0 || clickCount > 0) {
          metrics.push({
            date: dayStart.toISOString().split('T')[0],
            account: {
              _id: account._id,
              name: account.name,
              provider: account.provider
            },
            period: groupBy,
            isRealTime: isRealTime,
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
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return responseUtils.success(res, metrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const getMetricsByAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, emailIds, accountIds } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    
    let accountFilter = { userId };
    
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        accountFilter._id = { $in: accountIdArray };
      }
    }
    
    const accounts = await Account.find(accountFilter);
    
    if (accounts.length === 0) {
      return responseUtils.error(res, 'Nenhuma conta encontrada para o usuário');
    }
    
    const accountsWithMetrics = await Promise.all(
      accounts.map(async (account) => {
        const filter = {
          account: account._id,
          date: { $gte: start, $lte: end },
          period: 'day',
          userId
        };
        
        if (emailIds) {
          const emailIdArray = emailIds.split(',');
          if (emailIdArray.length > 0) {
            filter.email = { $in: emailIdArray };
          }
        }
        
        const metrics = await Metrics.find(filter);
        
        const aggregatedMetrics = metrics.reduce((acc, metric) => {
          Object.keys(metric.metrics).forEach(key => {
            if (typeof metric.metrics[key] === 'number') {
              if (key.includes('Rate')) {
                if (!acc[key + '_values']) acc[key + '_values'] = [];
                acc[key + '_values'].push(metric.metrics[key]);
              } else {
                acc[key] = (acc[key] || 0) + metric.metrics[key];
              }
            }
          });
          return acc;
        }, {});
        
        Object.keys(aggregatedMetrics).forEach(key => {
          if (key.endsWith('_values')) {
            const rateKey = key.replace('_values', '');
            const values = aggregatedMetrics[key];
            aggregatedMetrics[rateKey] = values.length > 0 ? 
              values.reduce((sum, val) => sum + val, 0) / values.length : 0;
            delete aggregatedMetrics[key];
          }
        });
        
        return {
          account: {
            id: account._id,
            name: account.name,
            provider: account.provider,
            url: account.url
          },
          metrics: aggregatedMetrics
        };
      })
    );
    
    return responseUtils.success(res, accountsWithMetrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

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
    
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    
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
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    
    const emails = await Email.find(emailFilter)
      .populate('account', 'name provider')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    
    const totalEmails = await Email.countDocuments(emailFilter);
    
    const emailsWithMetrics = await Promise.all(
      emails.map(async (email) => {
        const emailMetrics = await Metrics.find({
          email: email._id,
          date: { $gte: start, $lte: end },
          period: 'day',
          userId
        });
        
        let aggregatedMetrics = {};
        
        if (emailMetrics.length > 0) {
          aggregatedMetrics = emailMetrics.reduce((acc, metric) => {
            Object.keys(metric.metrics).forEach(key => {
              if (typeof metric.metrics[key] === 'number') {
                if (key.includes('Rate')) {
                  if (!acc[key + '_values']) acc[key + '_values'] = [];
                  acc[key + '_values'].push(metric.metrics[key]);
                } else {
                  acc[key] = (acc[key] || 0) + metric.metrics[key];
                }
              }
            });
            return acc;
          }, {});
          
          Object.keys(aggregatedMetrics).forEach(key => {
            if (key.endsWith('_values')) {
              const rateKey = key.replace('_values', '');
              const values = aggregatedMetrics[key];
              aggregatedMetrics[rateKey] = values.length > 0 ? 
                values.reduce((sum, val) => sum + val, 0) / values.length : 0;
              delete aggregatedMetrics[key];
            }
          });
        } else {
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
          
          const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
          const uniqueOpenRate = sentCount > 0 ? (uniqueOpenCount / sentCount) * 100 : 0;
          const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
          const uniqueClickRate = sentCount > 0 ? (uniqueClickCount / sentCount) * 100 : 0;
          const clickToOpenRate = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
          const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
          const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
          
          aggregatedMetrics = {
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
          };
        }
        
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
          metrics: aggregatedMetrics
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
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

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
    
    const validCompareTypes = ['accounts', 'emails'];
    if (!validCompareTypes.includes(compareType)) {
      return responseUtils.error(res, `Tipo de comparação inválido. Use: ${validCompareTypes.join(', ')}`);
    }
    
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    
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
        const emailIdArray = emailIds ? emailIds.split(',').filter(id => id.trim()) : [];
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

const getRecentEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 50,
      page = 1,
      eventTypes,
      accountIds,
      emailIds
    } = req.query;

    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }

    const filter = { userId };
    
    if (eventTypes) {
      const eventTypeArray = eventTypes.split(',').filter(type => type.trim());
      if (eventTypeArray.length > 0) {
        filter.eventType = { $in: eventTypeArray };
      }
    }
    
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        filter.account = { $in: accountIdArray };
      }
    }
    
    if (emailIds) {
      const emailIdArray = emailIds.split(',').filter(id => id.trim());
      if (emailIdArray.length > 0) {
        filter.email = { $in: emailIdArray };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'email',
        select: 'subject name createdAt'
      })
      .populate({
        path: 'account',
        select: 'name provider'
      });

    const formattedEvents = events.map(event => ({
      id: event._id,
      eventType: event.eventType,
      contactEmail: event.contactEmail,
      timestamp: event.timestamp,
      isFirstInteraction: event.isFirstInteraction,
      url: event.url,
      account: event.account ? {
        id: event.account._id,
        name: event.account.name,
        provider: event.account.provider
      } : null,
      email: event.email ? {
        id: event.email._id,
        subject: event.email.subject,
        name: event.email.name,
        createdAt: event.email.createdAt
      } : null
    }));

    return responseUtils.success(res, formattedEvents);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const getDetailedEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      emailIds, 
      eventTypes,
      contactEmail,
      limit = 100, 
      page = 1 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : dateHelpers.subDays(new Date(), 7);
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    
    const eventFilter = {
      userId,
      timestamp: { $gte: start, $lte: end }
    };
    
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        eventFilter.account = { $in: accountIdArray };
      }
    }
    
    if (emailIds) {
      const emailIdArray = emailIds.split(',').filter(id => id.trim());
      if (emailIdArray.length > 0) {
        eventFilter.email = { $in: emailIdArray };
      }
    }
    
    if (eventTypes) {
      const eventTypeArray = eventTypes.split(',').filter(type => type.trim());
      if (eventTypeArray.length > 0) {
        eventFilter.eventType = { $in: eventTypeArray };
      }
    }
    
    if (contactEmail) {
      eventFilter.contactEmail = { $regex: contactEmail, $options: 'i' };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    
    const events = await Event.find(eventFilter)
      .populate('account', 'name provider')
      .populate('email', 'subject name createdAt')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageSize);
    
    const totalEvents = await Event.countDocuments(eventFilter);
    
    const formattedEvents = events.map(event => ({
      id: event._id,
      eventType: event.eventType,
      timestamp: event.timestamp,
      contactEmail: event.contactEmail,
      contactId: event.contactId,
      isFirstInteraction: event.isFirstInteraction,
      url: event.url,
      bounceType: event.bounceType,
      bounceReason: event.bounceReason,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      account: event.account ? {
        id: event.account._id,
        name: event.account.name,
        provider: event.account.provider
      } : null,
      email: event.email ? {
        id: event.email._id,
        subject: event.email.subject,
        name: event.email.name,
        createdAt: event.email.createdAt
      } : null
    }));
    
    return responseUtils.success(res, {
      events: formattedEvents,
      pagination: {
        page: parseInt(page),
        limit: pageSize,
        total: totalEvents,
        pages: Math.ceil(totalEvents / pageSize)
      },
      filters: {
        startDate: start,
        endDate: end,
        accountIds,
        emailIds,
        eventTypes,
        contactEmail
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  getMetricsByDate,
  getMetricsByAccount, 
  getMetricsByEmail,
  compareMetrics,
  getRecentEvents,
  getDetailedEvents
};
