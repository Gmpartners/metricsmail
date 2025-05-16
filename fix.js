// Obter métricas por email com suporte aprimorado para múltiplos emails
const getMetricsByEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate, 
      accountIds, 
      campaignIds, 
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
    const emailFilter = { userId };
    
    // Processar filtros de múltiplos IDs usando utilidade
    const { accountIdArray, campaignIdArray, emailIdArray } = filterUtil.processMultipleIdsParams(req.query);
    
    // Aplicar filtros de IDs
    if (accountIdArray) {
      emailFilter.account = { $in: accountIdArray };
    }
    
    if (campaignIdArray) {
      emailFilter.campaign = { $in: campaignIdArray };
    }
    
    if (emailIdArray) {
      emailFilter._id = { $in: emailIdArray };
    }
    
    // Definir paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = parseInt(limit);
    
    // Buscar emails com paginação e informações relacionadas
    const emails = await Email.find(emailFilter)
      .populate('account', 'name provider')
      .populate('campaign', 'name')
      .sort({ sentDate: -1 })
      .skip(skip)
      .limit(pageSize);
    
    // Log para depuração
    console.log(`Encontrados ${emails.length} emails com os filtros fornecidos`);
    
    // Contar total para paginação
    const totalEmails = await Email.countDocuments(emailFilter);
    
    // Para cada email, buscar suas métricas com base em eventos
    const emailsWithMetrics = await Promise.all(
      emails.map(async (email) => {
        // Filtro para eventos deste email
        const eventFilter = {
          userId,
          email: email._id, // Usa o campo email que é um ObjectId
          timestamp: { $gte: start, $lte: end }
        };
        
        console.log("Filtro de evento:", eventFilter);
        
        // Contar eventos por tipo
        const sentCount = await Event.countDocuments({ ...eventFilter, eventType: 'send' });
        const deliveredCount = await Event.countDocuments({ ...eventFilter, eventType: 'delivery' });
        const openCount = await Event.countDocuments({ ...eventFilter, eventType: 'open' });
        const clickCount = await Event.countDocuments({ ...eventFilter, eventType: 'click' });
        const bounceCount = await Event.countDocuments({ ...eventFilter, eventType: 'bounce' });
        const unsubscribeCount = await Event.countDocuments({ ...eventFilter, eventType: 'unsubscribe' });
        
        console.log(`Contagem de envios: ${sentCount}, Contagem de aberturas: ${openCount}, Contagem de cliques: ${clickCount}`);
        
        // Contar contatos únicos para aberturas e cliques
        const uniqueOpeners = await Event.distinct('contactEmail', { ...eventFilter, eventType: 'open' });
        const uniqueClickers = await Event.distinct('contactEmail', { ...eventFilter, eventType: 'click' });
        
        // Obter contatos recentes que abriram ou clicaram (até 5)
        const recentInteractions = await Event.find({
          ...eventFilter,
          eventType: { $in: ['open', 'click'] }
        })
        .sort({ timestamp: -1 })
        .limit(5);
        
        // Formatar interações recentes
        const recentContacts = recentInteractions.map(event => ({
          contactEmail: event.contactEmail,
          eventType: event.eventType,
          timestamp: event.timestamp
        }));
        
        // Métricas calculadas
        const metrics = {
          sentCount,
          deliveredCount,
          openCount,
          uniqueOpenCount: uniqueOpeners.length,
          clickCount,
          uniqueClickCount: uniqueClickers.length,
          bounceCount,
          unsubscribeCount
        };
        
        // Calcular taxas
        const openRate = deliveredCount > 0 ? (uniqueOpeners.length / deliveredCount) * 100 : 0;
        const clickRate = deliveredCount > 0 ? (uniqueClickers.length / deliveredCount) * 100 : 0;
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
        const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
        const clickToOpenRate = uniqueOpeners.length > 0 ? (uniqueClickers.length / uniqueOpeners.length) * 100 : 0;
        
        // Retornar dados formatados para o email
        return {
          id: email._id,
          subject: email.subject,
          sentDate: email.sentDate,
          fromName: email.fromName,
          fromEmail: email.fromEmail,
          campaign: email.campaign ? {
            id: email.campaign._id,
            name: email.campaign.name
          } : null,
          account: email.account ? {
            id: email.account._id,
            name: email.account.name,
            provider: email.account.provider
          } : null,
          metrics: {
            ...metrics,
            openRate,
            clickRate,
            bounceRate,
            unsubscribeRate,
            clickToOpenRate
          },
          recentContacts
        };
      })
    );
    
    // Calcular totais e médias se houver vários emails selecionados
    let totals = null;
    let averages = null;
    
    if (emailsWithMetrics.length > 1) {
      // Inicializar contadores
      totals = {
        sentCount: 0,
        deliveredCount: 0,
        openCount: 0,
        uniqueOpenCount: 0,
        clickCount: 0,
        uniqueClickCount: 0,
        bounceCount: 0,
        unsubscribeCount: 0
      };
      
      // Somar métricas
      emailsWithMetrics.forEach(email => {
        Object.keys(totals).forEach(key => {
          totals[key] += email.metrics[key] || 0;
        });
      });
      
      // Calcular médias
      averages = {
        openRate: totals.deliveredCount > 0 ? (totals.uniqueOpenCount / totals.deliveredCount) * 100 : 0,
        clickRate: totals.deliveredCount > 0 ? (totals.uniqueClickCount / totals.deliveredCount) * 100 : 0,
        bounceRate: totals.sentCount > 0 ? (totals.bounceCount / totals.sentCount) * 100 : 0,
        unsubscribeRate: totals.deliveredCount > 0 ? (totals.unsubscribeCount / totals.deliveredCount) * 100 : 0,
        clickToOpenRate: totals.uniqueOpenCount > 0 ? (totals.uniqueClickCount / totals.uniqueOpenCount) * 100 : 0
      };
    }
    
    // Retornar com informações de paginação
    return responseUtils.success(res, {
      emails: emailsWithMetrics,
      totals,
      averages,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalItems: totalEmails,
        totalPages: Math.ceil(totalEmails / pageSize)
      }
    });
  } catch (err) {
    console.error('Erro ao obter métricas por email:', err);
    return responseUtils.serverError(res, err);
  }
};
