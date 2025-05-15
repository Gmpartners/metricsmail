const mongoose = require('mongoose');
const { Campaign } = require('./src/models');
require('dotenv').config();

async function testCampaignSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Buscar todas as campanhas
    const allCampaigns = await Campaign.find({});
    console.log(`Total de campanhas: ${allCampaigns.length}`);
    
    // Verificar as que têm campaignID
    const withCampaignId = allCampaigns.filter(campaign => campaign.campaignID !== undefined);
    console.log(`Campanhas com campaignID: ${withCampaignId.length}`);
    
    if (withCampaignId.length > 0) {
      console.log('\nTestando busca por campaignID:');
      
      for (const campaign of withCampaignId.slice(0, 3)) { // Testar as 3 primeiras
        console.log(`\nCampanha: ${campaign.name}`);
        console.log(`_id: ${campaign._id}`);
        console.log(`campaignID: ${campaign.campaignID}`);
        
        // Tentar buscar pelo campaignID
        console.log(`Buscando pelo campaignID como Number: ${campaign.campaignID}`);
        const foundByNumber = await Campaign.findOne({ campaignID: campaign.campaignID });
        console.log(`Resultado: ${foundByNumber ? 'Encontrado' : 'NÃO encontrado'}`);
        
        // Tentar buscar pelo campaignID como String
        console.log(`Buscando pelo campaignID como String: "${campaign.campaignID}"`);
        const foundByString = await Campaign.findOne({ campaignID: String(campaign.campaignID) });
        console.log(`Resultado: ${foundByString ? 'Encontrado' : 'NÃO encontrado'}`);
        
        // Tentar busca direta por campaignID
        console.log(`Buscando diretamente por campaignID:`);
        const foundDirect = await Campaign.findOne({ campaignID: campaign.campaignID });
        console.log(`Resultado: ${foundDirect ? 'Encontrado' : 'NÃO encontrado'}`);
      }
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Erro ao testar busca:', error);
    mongoose.connection.close();
  }
}

testCampaignSearch();
