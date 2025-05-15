    if (campaignId) {
      try {
        // Verificar se a campanha é válida
        let campaign;
        
        // Tentar encontrar pelo campaignID numérico primeiro
        campaign = await Campaign.findOne({ campaignID: Number(campaignId) });
        
        // Se não encontrar pelo campaignID, tentar pelo ObjectId ou externalId
        if (!campaign) {
          if (mongoose.Types.ObjectId.isValid(campaignId)) {
            campaign = await Campaign.findOne({ _id: campaignId });
          } else {
            // Se não for um ObjectId válido, buscar por externalId
            campaign = await Campaign.findOne({ externalId: campaignId });
          }
        }
        
        if (!campaign) {
          return responseUtils.error(res, "Campanha não encontrada");
        }
        
        // Usar o ObjectId da campanha para relacionamentos internos
        emailFilter.campaign = campaign._id;
      } catch (error) {
        console.error("Erro ao buscar campanha:", error);
        return responseUtils.error(res, "Erro ao processar ID da campanha: " + error.message);
      }
    }
