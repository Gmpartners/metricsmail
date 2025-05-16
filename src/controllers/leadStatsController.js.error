const mongoose = require('mongoose');
const Account = require('../models/accountModel');
const LeadStats = require('../models/leadStatsModel');
const responseUtils = require('../utils/responseUtil');

// Função auxiliar para ajustar para UTC -3 (Brasil)
const getBrasilDate = (date) => {
  const d = new Date(date);
  d.setHours(d.getHours() - 3); // UTC-3
  return d;
};

// Função auxiliar para formatar data como YYYY-MM-DD
const formatDate = (date) => {
  const d = getBrasilDate(date);
  return d.toISOString().split('T')[0];
};

// Função auxiliar para obter dados do dia atual via API do Mautic
async function getTodayLeadStats(accountId) {
  try {
    const account = await Account.findById(accountId);
    if (!account) return { success: false, count: 0 };
    
    const today = new Date();
    const formattedDate = formatDate(today);
    const startDate = `${formattedDate} 00:00:00`;
    const endDate = `${formattedDate} 23:59:59`;
    
    const result = await account.getMauticLeadsByDate(startDate, endDate);
    return { 
      success: true, 
      count: result.success ? result.total : 0,
      isRealTime: true
    };
  } catch (error) {
    console.error(`Erro ao buscar dados do dia atual: ${error.message}`);
    return { success: false, count: 0 };
  }
}

// Salvar estatísticas de leads para uma data específica
const saveLeadStats = async (req, res) => {
  try {
    const { accountId, date } = req.params;
    
    if (!accountId || !date) {
      return responseUtils.error(res, 'accountId e date são obrigatórios');
    }
    
    // Validar formato da data (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return responseUtils.error(res, 'Data deve estar no formato YYYY-MM-DD');
    }
    
    // Verificar se a conta existe
    const account = await Account.findById(accountId);
    if (!account) {
      return responseUtils.notFound(res, 'Conta não encontrada');
    }
    
    // Definir horário de início e fim do dia
    const startDate = `${date} 00:00:00`;
    const endDate = `${date} 23:59:59`;
    
    // Buscar leads para esta data
    const result = await account.getMauticLeadsByDate(startDate, endDate);
    
    if (!result.success) {
      return responseUtils.error(res, `Falha ao buscar leads do Mautic: ${result.message}`);
    }
    
    // Salvar ou atualizar estatísticas
    const stats = await LeadStats.findOneAndUpdate(
      { accountId, date },
      { count: result.total, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    
    return responseUtils.success(res, stats);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Obter estatísticas de leads para um período
const getLeadStats = async (req, res) => {
  try {
    const { accountIds, startDate, endDate } = req.query;
    
    if (!accountIds) {
      return responseUtils.error(res, 'É necessário especificar pelo menos uma conta');
    }
    
    // Converter parâmetros
    const accountIdArray = accountIds.split(',');
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
    const end = endDate ? new Date(endDate) : new Date();
    
    // Formatar datas
    const formattedStartDate = formatDate(start);
    const formattedEndDate = formatDate(end);
    const today = formatDate(new Date());
    
    // Buscar dados históricos do banco
    const historicalStats = await LeadStats.find({
      accountId: { $in: accountIdArray },
      date: { 
        : formattedStartDate,
        : formattedEndDate,
        : today // Excluir hoje, pois buscaremos em tempo real
      }
    }).sort({ date: 1 });
    
    // Agrupar por conta
    const statsByAccount = {};
    
    // Preparar estrutura de dados vazia para cada conta
    for (const accountId of accountIdArray) {
      statsByAccount[accountId] = [];
    }
    
    // Preencher com dados históricos
    historicalStats.forEach(stat => {
      if (statsByAccount[stat.accountId]) {
        statsByAccount[stat.accountId].push({
          date: stat.date,
          count: stat.count,
          isRealTime: false
        });
      }
    });
    
    // Buscar e adicionar dados do dia atual, se estiver no período solicitado
    if (formattedStartDate <= today && today <= formattedEndDate) {
      const todayPromises = accountIdArray.map(async (accountId) => {
        const todayStats = await getTodayLeadStats(accountId);
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
    
    // Buscar informações das contas para retornar nomes e cores
    const accounts = await Account.find({ _id: { : accountIdArray } }, 'name _id');
    const accountMap = {};
    accounts.forEach(account => {
      accountMap[account._id.toString()] = account.name;
    });
    
    // Formatar resposta
    const datasets = Object.keys(statsByAccount).map((accountId, index) => {
      // Cores predefinidas para os gráficos
      const colors = ['#FF5733', '#3366FF', '#33FF57', '#FF33A8', '#33A8FF', '#A833FF', '#FFD733'];
      
      return {
        accountId,
        accountName: accountMap[accountId] || `Conta ${accountId}`,
        color: colors[index % colors.length],
        data: statsByAccount[accountId].sort((a, b) => a.date.localeCompare(b.date))
      };
    });
    
    // Calcular totais e médias
    let totalLeads = 0;
    let dayCount = 0;
    
    datasets.forEach(dataset => {
      dataset.data.forEach(day => {
        totalLeads += day.count;
        dayCount++;
      });
    });
    
    const avgPerDay = dayCount > 0 ? totalLeads / (dayCount / datasets.length) : 0;
    
    return responseUtils.success(res, {
      datasets,
      summary: {
        totalLeads,
        averagePerDay: Number(avgPerDay.toFixed(1))
      }
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Coletar e salvar estatísticas para o dia anterior
const collectYesterdayStats = async (req, res) => {
  try {
    // Calcular data de ontem (UTC-3)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatDate(yesterday);
    
    // Buscar todas as contas ativas
    const accounts = await Account.find({ status: 'active' });
    
    const results = [];
    
    for (const account of accounts) {
      try {
        // Formatar datas para a API do Mautic
        const startDate = `${dateStr} 00:00:00`;
        const endDate = `${dateStr} 23:59:59`;
        
        // Buscar leads
        const result = await account.getMauticLeadsByDate(startDate, endDate);
        
        if (result.success) {
          // Salvar estatísticas
          const stats = await LeadStats.findOneAndUpdate(
            { accountId: account._id.toString(), date: dateStr },
            { count: result.total, lastUpdated: new Date() },
            { upsert: true, new: true }
          );
          
          results.push({
            accountId: account._id,
            accountName: account.name,
            date: dateStr,
            count: result.total,
            success: true
          });
        } else {
          results.push({
            accountId: account._id,
            accountName: account.name,
            date: dateStr,
            error: result.message,
            success: false
          });
        }
      } catch (error) {
        results.push({
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
      results
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
