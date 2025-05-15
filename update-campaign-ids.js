const mongoose = require('mongoose');
const { Campaign } = require('./src/models');
require('dotenv').config();

async function updateCampaignIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Buscar todas as campanhas
    const campaigns = await Campaign.find({});
    console.log(`\nTotal de campanhas encontradas: ${campaigns.length}`);
    
    // Atualizar cada campanha com um campaignID
    let updateCount = 0;
    
    for (const campaign of campaigns) {
      // Gerar ID baseado no timestamp
      const campaignID = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1000);
      
      // Atualizar diretamente no banco de dados
      await mongoose.connection.db.collection('campaigns').updateOne(
        { _id: campaign._id },
        { $set: { campaignID } }
      );
      
      console.log(`Atualizada campanha "${campaign.name}" com campaignID: ${campaignID}`);
      updateCount++;
    }
    
    console.log(`\n${updateCount} campanhas atualizadas com sucesso!`);
    
    // Verificar se as atualizações funcionaram
    if (campaigns.length > 0) {
      const firstCampaign = await Campaign.findById(campaigns[0]._id);
      console.log(`\nVerificando primeira campanha depois da atualização:`);
      console.log(`- Nome: ${firstCampaign.name}`);
      console.log(`- campaignID: ${firstCampaign.campaignID}`);
      
      // Tentar buscar por campaignID
      if (firstCampaign.campaignID) {
        console.log(`\nTentando buscar por campaignID: ${firstCampaign.campaignID}`);
        const foundByCampaignId = await Campaign.findOne({ campaignID: firstCampaign.campaignID });
        console.log(`Resultado: ${foundByCampaignId ? 'Encontrado!' : 'Não encontrado.'}`);
      }
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Erro:', error);
    mongoose.connection.close();
  }
}

updateCampaignIds();
