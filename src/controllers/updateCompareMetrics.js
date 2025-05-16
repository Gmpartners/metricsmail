// Método para comparar métricas entre múltiplos itens
const compareMetrics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      campaignIds, 
      emailIds, 
      compareType = 'accounts' 
    } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar o tipo de comparação
    const validCompareTypes = ['accounts', 'campaigns', 'emails'];
    if (!validCompareTypes.includes(compareType)) {
      return responseUtils.error(res, `Tipo de comparação inválido. Use um dos seguintes: ${validCompareTypes.join(', ')}`);
    }
    
    // Verificar se pelo menos um ID foi fornecido para comparação
    const { accountIdArray, campaignIdArray, emailIdArray } = filterUtil.processMultipleIdsParams(req.query);
    
    // Verificar se há IDs para comparar com base no tipo de comparação
    switch (compareType) {
      case 'accounts':
        if (!accountIdArray || accountIdArray.length < 1) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos uma conta para comparação');
        }
        break;
      case 'campaigns':
        if (!campaignIdArray || campaignIdArray.length < 1) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos uma campanha para comparação');
        }
        break;
      case 'emails':
        if (!emailIdArray || emailIdArray.length < 1) {
          return responseUtils.error(res, 'É necessário fornecer pelo menos um email para comparação');
        }
        break;
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Variável para armazenar os resultados da comparação
    let comparisonResults = [];
    
    // Realizar a comparação com base no tipo selecionado
    switch (compareType) {
      case 'accounts':
        // Verificar se as contas pertencem ao usuário
        const accounts = await Account.find({ 
          _id: { $in: accountIdArray },
          userId
        });
        
        if (accounts.length === 0) {
          return responseUtils.error(res, 'Nenhuma conta válida encontrada para o usuário');
        }
        
        // Buscar eventos para cada conta no período especificado
        comparisonResults = await Promise.all(
          accounts.map(async (account) => {
            // Filtro para eventos usando o campo correto
            const eventFilter = {
              userId,
              account: account._id,  // Usa o campo account que é um ObjectId
              timestamp: { $gte: start, $lte: end }
            };
            
            // Contar eventos por tipo
            const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
            const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
            const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
            const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
            const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
            const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
            
            // Calcular taxas
            const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
            const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
            const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
            const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
            const clickToOpenRate = openCount > 0 ? (clickCount / openCount) * 100 : 0;
            
            return {
              id: account._id,
              accountId: account._id.toString(), // Adiciona o accountId para o frontend
              name: account.name,
              provider: account.provider,
              metrics: {
                sentCount,
                deliveredCount,
                openCount,
                clickCount,
                bounceCount,
                unsubscribeCount,
                openRate,
                clickRate,
                bounceRate,
                unsubscribeRate,
                clickToOpenRate
              }
            };
          })
        );
        break;
        
      case 'campaigns':
        // Verificar se as campanhas existem
        const campaigns = await Campaign.find({ 
          _id: { $in: campaignIdArray }
        }).populate('account', 'name provider');
        
        if (campaigns.length === 0) {
          return responseUtils.error(res, 'Nenhuma campanha válida encontrada');
        }
        
        // Verificar se as contas das campanhas pertencem ao usuário
        const campaignAccountIds = campaigns.map(campaign => campaign.account._id.toString());
        const userAccounts = await Account.find({ 
          _id: { $in: campaignAccountIds },
          userId 
        });
        
        const validAccountIds = userAccounts.map(account => account._id.toString());
        const validCampaigns = campaigns.filter(campaign => 
          validAccountIds.includes(campaign.account._id.toString())
        );
        
        if (validCampaigns.length === 0) {
          return responseUtils.error(res, 'Nenhuma campanha válida pertence ao usuário');
        }
        
        // Buscar eventos para cada campanha no período especificado
        comparisonResults = await Promise.all(
          validCampaigns.map(async (campaign) => {
            // Filtro para eventos usando o campo correto
            const eventFilter = {
              userId,
              campaign: campaign._id,  // Usa o campo campaign que é um ObjectId
              timestamp: { $gte: start, $lte: end }
            };
            
            // Contar eventos por tipo
            const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
            const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
            const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
            const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
            const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
            const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
            
            // Calcular taxas
            const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
            const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
            const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
            const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
            const clickToOpenRate = openCount > 0 ? (clickCount / openCount) * 100 : 0;
            
            return {
              id: campaign._id,
              campaignId: campaign._id.toString(), // Adiciona o campaignId para o frontend
              name: campaign.name,
              account: {
                id: campaign.account._id,
                accountId: campaign.account._id.toString(), // Adiciona o accountId para o frontend
                name: campaign.account.name,
                provider: campaign.account.provider
              },
              metrics: {
                sentCount,
                deliveredCount,
                openCount,
                clickCount,
                bounceCount,
                unsubscribeCount,
                openRate,
                clickRate,
                bounceRate,
                unsubscribeRate,
                clickToOpenRate
              }
            };
          })
        );
        break;
        
      case 'emails':
        // Buscar os emails especificados
        const emails = await Email.find({ 
          _id: { $in: emailIdArray },
          userId
        })
        .populate('account', 'name provider')
        .populate('campaign', 'name');
        
        if (emails.length === 0) {
          return responseUtils.error(res, 'Nenhum email válido encontrado para o usuário');
        }
        
        // Buscar eventos para cada email no período especificado
        comparisonResults = await Promise.all(
          emails.map(async (email) => {
            // Filtro para eventos usando o campo correto
            const eventFilter = {
              userId,
              email: email._id, // Usar o campo email que é um ObjectId
              timestamp: { $gte: start, $lte: end }
            };
            
            // Contar eventos por tipo
            const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
            const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
            const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
            const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
            const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
            const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
            
            // Calcular taxas
            const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
            const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
            const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
            const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
            const clickToOpenRate = openCount > 0 ? (clickCount / openCount) * 100 : 0;
            
            return {
              id: email._id,
              emailId: email._id.toString(), // Adiciona o emailId para o frontend
              subject: email.subject,
              sentDate: email.sentDate,
              campaign: email.campaign ? {
                id: email.campaign._id,
                campaignId: email.campaign._id.toString(), // Adiciona o campaignId para o frontend
                name: email.campaign.name
              } : null,
              account: email.account ? {
                id: email.account._id,
                accountId: email.account._id.toString(), // Adiciona o accountId para o frontend
                name: email.account.name,
                provider: email.account.provider
              } : null,
              metrics: {
                sentCount,
                deliveredCount,
                openCount,
                clickCount,
                bounceCount,
                unsubscribeCount,
                openRate,
                clickRate,
                bounceRate,
                unsubscribeRate,
                clickToOpenRate
              }
            };
          })
        );
        break;
    }
    
    // Calcular totais e médias para comparação
    const totals = {
      sentCount: 0,
      deliveredCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0
    };
    
    // Calcular totais
    comparisonResults.forEach(item => {
      totals.sentCount += item.metrics.sentCount || 0;
      totals.deliveredCount += item.metrics.deliveredCount || 0;
      totals.openCount += item.metrics.openCount || 0;
      totals.clickCount += item.metrics.clickCount || 0;
      totals.bounceCount += item.metrics.bounceCount || 0;
      totals.unsubscribeCount += item.metrics.unsubscribeCount || 0;
    });
    
    // Calcular médias
    const averages = {
      openRate: totals.deliveredCount > 0 ? (totals.openCount / totals.deliveredCount) * 100 : 0,
      clickRate: totals.deliveredCount > 0 ? (totals.clickCount / totals.deliveredCount) * 100 : 0,
      bounceRate: totals.sentCount > 0 ? (totals.bounceCount / totals.sentCount) * 100 : 0,
      unsubscribeRate: totals.deliveredCount > 0 ? (totals.unsubscribeCount / totals.deliveredCount) * 100 : 0,
      clickToOpenRate: totals.openCount > 0 ? (totals.clickCount / totals.openCount) * 100 : 0
    };
    
    // Determinar o melhor performer com base na taxa de clique e abertura
    let bestPerformer = null;
    if (comparisonResults.length > 0) {
      // Ordenar por taxa de clique e depois por taxa de abertura
      const sorted = [...comparisonResults].sort((a, b) => {
        if (a.metrics.clickRate === b.metrics.clickRate) {
          return b.metrics.openRate - a.metrics.openRate;
        }
        return b.metrics.clickRate - a.metrics.clickRate;
      });
      
      bestPerformer = {
        id: sorted[0].id,
        name: sorted[0].name || sorted[0].subject,
        // Adicionar os IDs específicos conforme o tipo de comparação
        ...(compareType === 'accounts' && { accountId: sorted[0].accountId }),
        ...(compareType === 'campaigns' && { campaignId: sorted[0].campaignId }),
        ...(compareType === 'emails' && { emailId: sorted[0].emailId }),
        metrics: {
          openRate: sorted[0].metrics.openRate,
          clickRate: sorted[0].metrics.clickRate,
          clickToOpenRate: sorted[0].metrics.clickToOpenRate
        }
      };
    }
    
    // Preparar dados para visualização comparativa
    const comparisonData = {
      compareType,
      dateRange: {
        start,
        end
      },
      items: comparisonResults,
      totals,
      averages,
      bestPerformer
    };
    
    return responseUtils.success(res, comparisonData);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};
