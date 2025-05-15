const mongoose = require('mongoose');
const { Campaign } = require('./src/models');
require('dotenv').config();

async function fixIndices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Verificar os índices existentes
    console.log('\nÍndices existentes na coleção Campaign:');
    const indices = await mongoose.connection.db.collection('campaigns').indexes();
    console.log(indices);
    
    // Criar índice explicitamente
    console.log('\nCriando índice para campaignID...');
    await mongoose.connection.db.collection('campaigns').createIndex({ campaignID: 1 }, { unique: true, sparse: true });
    
    // Tentar novamente após criar o índice
    console.log('\nVerificando se a busca agora funciona:');
    
    // Pegar uma campanha para testar
    const testCampaign = await Campaign.findOne();
    if (testCampaign && testCampaign.campaignID) {
      console.log(`Testando busca para campanha "${testCampaign.name}" com campaignID: ${testCampaign.campaignID}`);
      
      const foundCampaign = await Campaign.findOne({ campaignID: testCampaign.campaignID });
      console.log(`Resultado: ${foundCampaign ? 'Encontrado!' : 'Ainda não encontrado.'}`);
    }
    
    mongoose.connection.close();
    console.log('Conexão fechada.');
  } catch (error) {
    console.error('Erro:', error);
    mongoose.connection.close();
  }
}

fixIndices();
