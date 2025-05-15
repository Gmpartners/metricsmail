const mongoose = require('mongoose');
const { Campaign } = require('./src/models');
require('dotenv').config();

async function inspectCampaign(campaignId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Buscar campanha pelo ID exato
    console.log(`\nBuscando campanha com _id: ${campaignId}`);
    const campaignById = await Campaign.findById(campaignId);
    
    if (campaignById) {
      console.log('Campanha encontrada:');
      console.log(campaignById);
    } else {
      console.log('Campanha não encontrada pelo ID.');
    }
    
    // Verificar se a campanha tem campaignID
    if (campaignById && campaignById.campaignID) {
      console.log(`\nBuscando campanha com campaignID: ${campaignById.campaignID}`);
      const campaignByCampaignId = await Campaign.findOne({ campaignID: campaignById.campaignID });
      
      if (campaignByCampaignId) {
        console.log('Campanha encontrada pelo campaignID.');
      } else {
        console.log('Campanha NÃO encontrada pelo campaignID!');
      }
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Erro ao inspecionar campanha:', error);
    mongoose.connection.close();
  }
}

// Inspecionar a campanha encontrada anteriormente
inspectCampaign('681b93715fb58cfdebe55d76');
