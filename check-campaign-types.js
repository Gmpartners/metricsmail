const mongoose = require('mongoose');
const { Campaign } = require('./src/models');
require('dotenv').config();

async function checkCampaignTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Buscar diretamente da coleção para ver os tipos reais
    const campaigns = await mongoose.connection.db.collection('campaigns').find({}).toArray();
    
    console.log(`\nTotal de campanhas: ${campaigns.length}`);
    
    // Analisar os tipos dos campos campaignID
    console.log('\nTipos de campaignID encontrados:');
    const typesFound = new Map();
    
    campaigns.forEach(campaign => {
      if (campaign.campaignID !== undefined) {
        const type = typeof campaign.campaignID;
        typesFound.set(type, (typesFound.get(type) || 0) + 1);
        
        if (campaigns.indexOf(campaign) < 3) {
          console.log(`- Campanha "${campaign.name}": campaignID = ${campaign.campaignID} (${type})`);
        }
      } else {
        typesFound.set('undefined', (typesFound.get('undefined') || 0) + 1);
      }
    });
    
    console.log('\nDistribuição de tipos:');
    typesFound.forEach((count, type) => {
      console.log(`- ${type}: ${count} campanhas`);
    });
    
    // Testar a busca diretamente na coleção
    if (campaigns.length > 0 && campaigns[0].campaignID) {
      const testId = campaigns[0].campaignID;
      console.log(`\nTestando busca direta por campaignID = ${testId}`);
      
      const result = await mongoose.connection.db.collection('campaigns').findOne({ campaignID: testId });
      console.log(`Resultado: ${result ? 'Encontrado' : 'Não encontrado'}`);
      
      // Testar com diferentes tipos
      console.log('\nTestando diferentes tipos de busca:');
      
      const resultString = await mongoose.connection.db.collection('campaigns').findOne({ campaignID: String(testId) });
      console.log(`- Como String: ${resultString ? 'Encontrado' : 'Não encontrado'}`);
      
      const resultNumber = await mongoose.connection.db.collection('campaigns').findOne({ campaignID: Number(testId) });
      console.log(`- Como Number: ${resultNumber ? 'Encontrado' : 'Não encontrado'}`);
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Erro:', error);
    mongoose.connection.close();
  }
}

checkCampaignTypes();
