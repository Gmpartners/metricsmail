// Esta é a versão parcial com apenas as alterações necessárias nas funções que calculam taxas
// Vamos atualizar as partes relevantes da função getMetricsByEmail

const updateMetricsByEmail = (req, res) => {
  try {
    // ... código existente ...
    
    // Para cada email, buscar seus eventos e calcular as métricas
    const emailMetrics = await Promise.all(
      emails.map(async (email) => {
        const eventFilter = {
          userId,
          email: email._id,
          timestamp: { $gte: start, $lte: end }
        };
        
        // Contagens de eventos
        const sentCount = await Event.countDocuments({...eventFilter, eventType: 'send'});
        const deliveredCount = await Event.countDocuments({...eventFilter, eventType: 'delivery'});
        const openCount = await Event.countDocuments({...eventFilter, eventType: 'open'});
        const uniqueOpenCount = await Event.countDocuments({...eventFilter, eventType: 'open', isFirstInteraction: true});
        const clickCount = await Event.countDocuments({...eventFilter, eventType: 'click'});
        const uniqueClickCount = await Event.countDocuments({...eventFilter, eventType: 'click', isFirstInteraction: true});
        const bounceCount = await Event.countDocuments({...eventFilter, eventType: 'bounce'});
        const unsubscribeCount = await Event.countDocuments({...eventFilter, eventType: 'unsubscribe'});
        
        // Cálculo de taxas - CORREÇÃO aqui
        const deliveryRate = sentCount > 0 ? (deliveredCount / sentCount) * 100 : 0;
        
        // Taxa de abertura total (baseada em todas as aberturas)
        const openRate = deliveredCount > 0 ? (openCount / deliveredCount) * 100 : 0;
        
        // Taxa de abertura única (baseada em aberturas únicas)
        const uniqueOpenRate = deliveredCount > 0 ? (uniqueOpenCount / deliveredCount) * 100 : 0;
        
        // Taxa de clique total (baseada em todos os cliques)
        const clickRate = deliveredCount > 0 ? (clickCount / deliveredCount) * 100 : 0;
        
        // Taxa de clique única (baseada em cliques únicos)
        const uniqueClickRate = deliveredCount > 0 ? (uniqueClickCount / deliveredCount) * 100 : 0;
        
        // Taxa de clique para abertura (baseada em contagens únicas)
        const clickToOpenRate = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
        
        const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
        const unsubscribeRate = deliveredCount > 0 ? (unsubscribeCount / deliveredCount) * 100 : 0;
        
        // Buscar conta e campanha associadas
        const account = await Account.findById(email.account).select('name provider');
        const campaign = await Campaign.findById(email.campaign).select('name');
        
        return {
          email: {
            id: email._id,
            subject: email.subject,
            fromName: email.fromName
          },
          campaign: {
            id: campaign._id,
            name: campaign.name
          },
          account: {
            id: account._id,
            name: account.name,
            provider: account.provider
          },
          metrics: {
            sentCount,
            deliveredCount,
            openCount,
            uniqueOpenCount,
            clickCount,
            uniqueClickCount,
            bounceCount,
            unsubscribeCount,
            deliveryRate,
            openRate,           // Taxa baseada em aberturas TOTAIS
            uniqueOpenRate,     // NOVA taxa baseada em aberturas ÚNICAS
            clickRate,          // Taxa baseada em cliques TOTAIS
            uniqueClickRate,    // NOVA taxa baseada em cliques ÚNICOS
            clickToOpenRate,
            bounceRate,
            unsubscribeRate
          }
        };
      })
    );
    
    return responseUtils.success(res, emailMetrics);
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Também precisamos atualizar a função getOpenedEmails
const updateGetOpenedEmails = (req, res) => {
  try {
    // ... código existente ...
    
    // Calcular taxa de abertura total
    const totalOpenRate = deliveredCount > 0 ? (totalOpens / deliveredCount) * 100 : 0;
    
    // Calcular taxa de abertura única
    const uniqueOpenRate = deliveredCount > 0 ? (uniqueOpens / deliveredCount) * 100 : 0;
    
    // ... resto do código existente ...
    
    return responseUtils.success(res, {
      metrics: {
        totalOpens,
        uniqueOpens,
        deliveredCount,
        openRate: totalOpenRate,      // Renomeado para clareza
        uniqueOpenRate              // Nova métrica adicionada
      },
      recentOpens: formattedRecentOpens
    });
  } catch (err) {
    return responseUtils.serverError(res, err);
  }
};

// Essas são as alterações necessárias para as principais funções
// O mesmo padrão deve ser aplicado a outras funções que calculam essas taxas
