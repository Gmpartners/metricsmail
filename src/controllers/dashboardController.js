const mongoose = require("mongoose");
const { Metrics, Account, Event, Email } = require('../models');
const responseUtils = require('../utils/responseUtil');
const dateHelpers = require('../utils/dateHelpersUtil');

/**
 * Endpoint unificado para Dashboard
 * Baseado na lógica que funciona corretamente no metricsController.js
 * Retorna todos os dados necessários para o dashboard em uma única requisição
 */
const getDashboardMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      groupBy = 'day' 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    console.log(`🎯 [DASHBOARD] Iniciando busca para userId: ${userId}`);
    console.log(`📅 [DASHBOARD] Filtros recebidos:`, { startDate, endDate, accountIds });
    
    // Usar as datas exatamente como no metricsController (lógica que funciona)
    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    
    console.log(`📊 [DASHBOARD] Período processado: ${start.toISOString()} até ${end.toISOString()}`);
    
    // Filtro de contas (mesma lógica do metricsController)
    let accountFilter = { userId };
    if (accountIds) {
      const accountIdArray = accountIds.split(',').filter(id => id.trim());
      if (accountIdArray.length > 0) {
        accountFilter._id = { $in: accountIdArray };
      }
    }
    
    // Buscar contas válidas
    const accounts = await Account.find(accountFilter);
    
    if (accounts.length === 0) {
      return responseUtils.error(res, 'Nenhuma conta válida encontrada para o usuário');
    }
    
    console.log(`🏢 [DASHBOARD] Contas encontradas: ${accounts.length}`);
    
    // Arrays para armazenar dados processados
    const dailyMetrics = [];
    const accountMetrics = [];
    
    // Processar dados por dia (lógica copiada do getMetricsByDate)
    const currentDate = new Date(start);
    const today = new Date();
    
    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daysDiff = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
      const isRealTime = daysDiff <= 2;
      
      // Dados agregados do dia
      let dayTotals = {
        date: dayStart.toISOString().split('T')[0],
        sentCount: 0,
        openCount: 0,
        uniqueOpenCount: 0,
        clickCount: 0,
        uniqueClickCount: 0,
        bounceCount: 0,
        unsubscribeCount: 0,
        isRealTime,
        accounts: []
      };
      
      // Processar cada conta para este dia
      for (const account of accounts) {
        const eventFilter = {
          userId,
          account: account._id,
          timestamp: { $gte: dayStart, $lte: dayEnd }
        };
        
        const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
        const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
        const uniqueOpenCount = await Event.countDocuments({ ...eventFilter, eventType: 'open', isFirstInteraction: true });
        const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
        const uniqueClickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click', isFirstInteraction: true });
        const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
        const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
        
        // Somar ao total do dia
        if (sentCount > 0 || openCount > 0 || clickCount > 0) {
          dayTotals.sentCount += sentCount;
          dayTotals.openCount += openCount;
          dayTotals.uniqueOpenCount += uniqueOpenCount;
          dayTotals.clickCount += clickCount;
          dayTotals.uniqueClickCount += uniqueClickCount;
          dayTotals.bounceCount += bounceCount;
          dayTotals.unsubscribeCount += unsubscribeCount;
          
          dayTotals.accounts.push({
            id: account._id,
            name: account.name,
            provider: account.provider,
            metrics: {
              sentCount,
              openCount,
              uniqueOpenCount,
              clickCount,
              uniqueClickCount,
              bounceCount,
              unsubscribeCount
            }
          });
        }
      }
      
      // Adicionar ao array se houver dados
      if (dayTotals.sentCount > 0 || dayTotals.openCount > 0 || dayTotals.clickCount > 0) {
        dailyMetrics.push(dayTotals);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`📈 [DASHBOARD] Dias processados: ${dailyMetrics.length}`);
    
    // Calcular totais agregados do período
    const periodTotals = dailyMetrics.reduce((acc, day) => {
      acc.sentCount += day.sentCount;
      acc.openCount += day.openCount;
      acc.uniqueOpenCount += day.uniqueOpenCount;
      acc.clickCount += day.clickCount;
      acc.uniqueClickCount += day.uniqueClickCount;
      acc.bounceCount += day.bounceCount;
      acc.unsubscribeCount += day.unsubscribeCount;
      return acc;
    }, {
      sentCount: 0,
      openCount: 0,
      uniqueOpenCount: 0,
      clickCount: 0,
      uniqueClickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0
    });
    
    // Calcular taxas do período
    const periodRates = {
      openRate: periodTotals.sentCount > 0 ? (periodTotals.openCount / periodTotals.sentCount) * 100 : 0,
      uniqueOpenRate: periodTotals.sentCount > 0 ? (periodTotals.uniqueOpenCount / periodTotals.sentCount) * 100 : 0,
      clickRate: periodTotals.sentCount > 0 ? (periodTotals.clickCount / periodTotals.sentCount) * 100 : 0,
      uniqueClickRate: periodTotals.sentCount > 0 ? (periodTotals.uniqueClickCount / periodTotals.sentCount) * 100 : 0,
      clickToOpenRate: periodTotals.openCount > 0 ? (periodTotals.clickCount / periodTotals.openCount) * 100 : 0,
      uniqueClickToOpenRate: periodTotals.uniqueOpenCount > 0 ? (periodTotals.uniqueClickCount / periodTotals.uniqueOpenCount) * 100 : 0,
      bounceRate: periodTotals.sentCount > 0 ? (periodTotals.bounceCount / periodTotals.sentCount) * 100 : 0,
      unsubscribeRate: periodTotals.sentCount > 0 ? (periodTotals.unsubscribeCount / periodTotals.sentCount) * 100 : 0
    };
    
    // Preparar dados para gráficos (formato otimizado para o frontend)
    const chartData = {
      timeline: dailyMetrics.map(day => ({
        date: new Date(day.date).toLocaleDateString('pt-BR', { 
          day: '2-digit',
          month: '2-digit'
        }),
        fullDate: day.date,
        enviados: day.sentCount,
        aberturas: day.openCount,
        aberturasUnicas: day.uniqueOpenCount,
        cliques: day.clickCount,
        cliquesUnicos: day.uniqueClickCount,
        isRealTime: day.isRealTime
      })),
      byAccount: [] // Será preenchido abaixo
    };
    
    // Processar métricas agregadas por conta para o gráfico de contas
    const accountTotalsMap = new Map();
    
    dailyMetrics.forEach(day => {
      day.accounts.forEach(accountData => {
        const accountId = accountData.id.toString();
        
        if (!accountTotalsMap.has(accountId)) {
          accountTotalsMap.set(accountId, {
            id: accountData.id,
            name: accountData.name,
            provider: accountData.provider,
            sentCount: 0,
            openCount: 0,
            uniqueOpenCount: 0,
            clickCount: 0,
            uniqueClickCount: 0,
            bounceCount: 0,
            unsubscribeCount: 0
          });
        }
        
        const accountTotal = accountTotalsMap.get(accountId);
        accountTotal.sentCount += accountData.metrics.sentCount;
        accountTotal.openCount += accountData.metrics.openCount;
        accountTotal.uniqueOpenCount += accountData.metrics.uniqueOpenCount;
        accountTotal.clickCount += accountData.metrics.clickCount;
        accountTotal.uniqueClickCount += accountData.metrics.uniqueClickCount;
        accountTotal.bounceCount += accountData.metrics.bounceCount;
        accountTotal.unsubscribeCount += accountData.metrics.unsubscribeCount;
      });
    });
    
    // Converter para array e calcular taxas por conta
    chartData.byAccount = Array.from(accountTotalsMap.values()).map(account => ({
      id: account.id,
      name: account.name.substring(0, 15),
      fullName: account.name,
      provider: account.provider,
      enviados: account.sentCount,
      aberturas: account.openCount,
      aberturasUnicas: account.uniqueOpenCount,
      cliques: account.clickCount,
      cliquesUnicos: account.uniqueClickCount,
      taxaAbertura: account.sentCount > 0 ? (account.openCount / account.sentCount) * 100 : 0,
      taxaClique: account.sentCount > 0 ? (account.clickCount / account.sentCount) * 100 : 0,
      ctr: account.openCount > 0 ? (account.clickCount / account.openCount) * 100 : 0
    }));
    
    // Estatísticas adicionais
    const stats = {
      totalAccounts: accounts.length,
      daysInPeriod: dailyMetrics.length,
      averagePerDay: {
        sent: dailyMetrics.length > 0 ? Math.round(periodTotals.sentCount / dailyMetrics.length) : 0,
        opens: dailyMetrics.length > 0 ? Math.round(periodTotals.openCount / dailyMetrics.length) : 0,
        clicks: dailyMetrics.length > 0 ? Math.round(periodTotals.clickCount / dailyMetrics.length) : 0
      }
    };
    
    const response = {
      success: true,
      data: {
        // Totais do período (substituem os cálculos complexos do frontend)
        totals: periodTotals,
        
        // Taxas calculadas (substituem os cálculos do frontend)
        rates: periodRates,
        
        // Dados para gráficos já formatados
        chartData,
        
        // Informações do período
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          days: dailyMetrics.length
        },
        
        // Estatísticas adicionais
        stats,
        
        // Controle de estado
        isFiltered: !!(startDate && endDate),
        accountsIncluded: accountIds ? accountIds.split(',').length : accounts.length,
        
        // Metadados para cache/debug
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    console.log(`✅ [DASHBOARD] Processamento concluído:`);
    console.log(`   - Enviados: ${periodTotals.sentCount}`);
    console.log(`   - Aberturas: ${periodTotals.openCount} (${periodRates.openRate.toFixed(1)}%)`);
    console.log(`   - Cliques: ${periodTotals.clickCount} (${periodRates.clickRate.toFixed(1)}%)`);
    console.log(`   - Contas: ${stats.totalAccounts}`);
    console.log(`   - Dias: ${stats.daysInPeriod}`);
    
    return responseUtils.success(res, response.data);
    
  } catch (err) {
    console.error('❌ [DASHBOARD] Erro ao processar:', err);
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  getDashboardMetrics
};
