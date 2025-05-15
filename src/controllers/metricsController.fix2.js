/* 
  * Arquivo de correção para o metricsController.js
  * Este arquivo contém apenas a função getMetricsByEmail corrigida
  * para resolver o problema de "Cast to ObjectId failed"
*/

const getMetricsByEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, accountId, campaignId } = req.query;
    
    if (!userId) {
      return responseUtils.error(res, 'User ID é obrigatório');
    }
    
    // Validar datas
    const start = startDate ? new Date(startDate) : dateHelpers.subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Filtro para emails
    const emailFilter = { userId };
    
    if (accountId) {
      // Verificar se a conta pertence ao usuário
      const account = await Account.findOne({ _id: accountId, userId });
      
      if (!account) {
        return responseUtils.error(res, 'Conta não encontrada ou não pertence ao usuário');
      }
      
      emailFilter.account = accountId;
    }
    
    if (campaignId) {
      try {
        // Buscar a campanha pelo ID numérico ou pelo ObjectId, dependendo do formato
        let campaign;
        
        // Verifica se o campaignId é um ObjectId válido ou um ID numérico
        if (mongoose.Types.ObjectId.isValid(campaignId)) {
          campaign = await Campaign.findOne({ _id: campaignId });
        } else {
          // Se não for um ObjectId válido, pode ser um ID numérico
          // Verificar se existe um campo numericId no seu modelo ou
          // buscar usando externalId, que pode armazenar IDs de sistemas externos
          campaign = await Campaign.findOne({ externalId: campaignId });
        }
        
        if (!campaign) {
          return responseUtils.error(res, 'Campanha não encontrada');
        }
        
        // Use o ObjectId do MongoDB da campanha encontrada
        emailFilter.campaign = campaign._id;
      } catch (error) {
        console.error('Erro ao buscar campanha:', error);
        return responseUtils.error(res, 'Erro ao processar ID da campanha: ' + error.message);
      }
    }
    
    // Buscar emails do usuário
    const emails = await Email.find(emailFilter).select('_id subject fromName account campaign');
    
    // Para cada email, buscar seus eventos e calcular as métricas
    const emailMetrics = await Promise.all(
      emails.map(async (email) => {
        // Cálculos de métricas...
        // (manter o restante do código como está)
      })
    );
    
    // Retornar as métricas
    return responseUtils.success(res, emailMetrics);
    
  } catch (error) {
    console.error('Erro ao buscar métricas por email:', error);
    return responseUtils.error(res, 'Erro ao buscar métricas por email: ' + error.message);
  }
};
