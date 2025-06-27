const mongoose = require('mongoose');
const Account = require('../models/accountModel');
const LeadStats = require('../models/leadStatsModel');
const responseUtils = require('../utils/responseUtil');

// Função para converter data para timezone do Brasil (apenas para data atual)
const getBrasilDate = (date) => {
  const d = new Date(date);
  d.setHours(d.getHours() - 3);
  return d;
};

// Função para formatar data atual (com timezone)
const formatCurrentDate = (date) => {
  const d = getBrasilDate(date);
  return d.toISOString().split('T')[0];
};

// Função para formatar datas de filtro (SEM timezone) - CORREÇÃO PRINCIPAL
const formatFilterDate = (dateString) => {
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString; // Retorna a data como está, sem conversão
  }
  // Se for um objeto Date, converter para string sem timezone
  const d = new Date(dateString);
  return d.toISOString().split('T')[0];
};

async function getTodayLeadStats(accountId) {
  try {
    const account = await Account.findById(accountId);
    if (!account || account.status !== 'active') return { success: false, count: 0 };
    
    const today = new Date();
    const formattedDate = formatCurrentDate(today);
    const startDate = ;
    const endDate = ;
    
    const result = await account.getMauticLeadsByDate(startDate, endDate);
    return { 
      success: true, 
      count: result.success ? result.total : 0,
      isRealTime: true
    };
  } catch (error) {
    console.error();
    return { success: false, count: 0 };
  }
}

const saveLeadStats = async (req, res) => {
  try {
    const { userId, accountId, date } = req.params;
    
    if (!userId || !accountId || !date) {
      return responseUtils.error(res, 'userId, accountId e date são obrigatórios');
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return responseUtils.error(res, 'Data deve estar no formato YYYY-MM-DD');
    }
    
    const account = await Account.findOne({
      _id: accountId,
      userId: userId,
      status: 'active'
    });
    
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada ou inativa');
    }
    
    const startDate = ;
    const endDate = ;
    
    const result = await account.getMauticLeadsByDate(startDate, endDate);
    
    if (!result.success) {
      return responseUtils.error(res, );
    }
    
    const stats = await LeadStats.findOneAndUpdate(
      { userId, accountId, date },
      { count: result.total, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    
    return responseUtils.success(res, stats);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

const getLeadStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountIds, startDate, endDate } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    console.log('[LEADSTATS] Parâmetros recebidos:', { userId, accountIds, startDate, endDate });
    
    let accountFilter = { userId, status: 'active' };
    
    if (accountIds) {
      const accountIdArray = accountIds.split(',');
      if (accountIdArray.length > 0) {
        accountFilter._id = { $in: accountIdArray };
      }
    }
    
    const accounts = await Account.find(accountFilter, '_id name');
    
    if (accounts.length === 0) {
      return responseUtils.success(res, {
        datasets: [],
        summary: { totalLeads: 0, averagePerDay: 0 }
      });
    }
    
    const accountIdArray = accounts.map(account => account._id.toString());
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // CORREÇÃO: Usar formatFilterDate para datas de filtro
    const formattedStartDate = formatFilterDate(startDate || start);
    const formattedEndDate = formatFilterDate(endDate || end);
    const today = formatCurrentDate(new Date());
    
    console.log('[LEADSTATS] Datas processadas:', { 
      original: { startDate, endDate },
      formatted: { formattedStartDate, formattedEndDate, today }
    });
    
    const historicalStats = await LeadStats.find({
      userId,
      accountId: { $in: accountIdArray },
      date: { 
        $gte: formattedStartDate,
        $lte: formattedEndDate,
        $ne: today
      }
    }).sort({ date: 1 });
    
    console.log('[LEADSTATS] Dados históricos encontrados:', historicalStats.length);
    
    const statsByAccount = {};
    
    for (const accountId of accountIdArray) {
      statsByAccount[accountId] = [];
    }
    
    historicalStats.forEach(stat => {
      if (statsByAccount[stat.accountId]) {
        statsByAccount[stat.accountId].push({
          date: stat.date,
          count: stat.count,
          isRealTime: false
        });
      }
    });
    
    // Verificar se deve buscar dados de hoje em tempo real
    const shouldGetToday = formattedStartDate <= today && today <= formattedEndDate;
    console.log('[LEADSTATS] Deve buscar dados de hoje?', shouldGetToday);
    
    if (shouldGetToday) {
      const todayPromises = accountIdArray.map(async (accountId) => {
        const todayStats = await getTodayLeadStats(accountId);
        console.log('[LEADSTATS] Dados de hoje para conta', accountId, ':', todayStats);
        if (todayStats.success && statsByAccount[accountId]) {
          statsByAccount[accountId].push({
            date: today,
            count: todayStats.count,
            isRealTime: true
          });
        }
        return todayStats;
      });
      
      await Promise.all(todayPromises);
    }
    
    const accountMap = {};
    accounts.forEach(account => {
      accountMap[account._id.toString()] = account.name;
    });
    
    const datasets = Object.keys(statsByAccount).map((accountId, index) => {
      const colors = ['#FF5733', '#3366FF', '#33FF57', '#FF33A8', '#33A8FF', '#A833FF', '#FFD733'];
      
      return {
        accountId,
        accountName: accountMap[accountId] || ,
        color: colors[index % colors.length],
        data: statsByAccount[accountId].sort((a, b) => a.date.localeCompare(b.date))
      };
    });
    
    let totalLeads = 0;
    let dayCount = 0;
    
    datasets.forEach(dataset => {
      dataset.data.forEach(day => {
        totalLeads += day.count;
        dayCount++;
      });
    });
    
    const avgPerDay = dayCount > 0 ? totalLeads / (dayCount / datasets.length) : 0;
    
    console.log('[LEADSTATS] Resultado final:', { 
      datasetsCount: datasets.length, 
      totalLeads, 
      avgPerDay 
    });
    
    return responseUtils.success(res, {
      datasets,
      summary: {
        totalLeads,
        averagePerDay: Number(avgPerDay.toFixed(1))
      }
    });
  } catch (err) {
    console.error('[LEADSTATS] Erro:', err);
    return responseUtils.serverError(res, err);
  }
};

const collectYesterdayStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatCurrentDate(yesterday);
    
    let accountFilter = { status: 'active' };
    
    if (userId) {
      accountFilter.userId = userId;
    }
    
    const accounts = await Account.find(accountFilter);
    
    if (accounts.length === 0) {
      return responseUtils.success(res, {
        date: dateStr,
        results: [],
        message: "Nenhuma conta ativa encontrada"
      });
    }
    
    const results = [];
    
    for (const account of accounts) {
      try {
        const startDate = ;
        const endDate = ;
        
        const result = await account.getMauticLeadsByDate(startDate, endDate);
        
        if (result.success) {
          const stats = await LeadStats.findOneAndUpdate(
            { 
              userId: account.userId,
              accountId: account._id.toString(), 
              date: dateStr 
            },
            { count: result.total, lastUpdated: new Date() },
            { upsert: true, new: true }
          );
          
          results.push({
            userId: account.userId,
            accountId: account._id,
            accountName: account.name,
            date: dateStr,
            count: result.total,
            success: true
          });
        } else {
          results.push({
            userId: account.userId,
            accountId: account._id,
            accountName: account.name,
            date: dateStr,
            error: result.message,
            success: false
          });
        }
      } catch (error) {
        results.push({
          userId: account.userId,
          accountId: account._id,
          accountName: account.name,
          date: dateStr,
          error: error.message,
          success: false
        });
      }
    }
    
    return responseUtils.success(res, {
      date: dateStr,
      results,
      summary: {
        total: accounts.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  getLeadStats,
  saveLeadStats,
  collectYesterdayStats
};
