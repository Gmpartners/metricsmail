const mongoose = require('mongoose');
const { Campaign, Account } = require('./src/models');
require('dotenv').config();

async function listCampaignsForUser(userId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Listar campanhas do usuário
    const campaigns = await Campaign.find({ userId })
      .populate('account', 'name provider')
      .select('_id name account externalId campaignID');
    
    console.log(`\nCampanhas para o usuário ${userId}: ${campaigns.length}`);
    
    if (campaigns.length > 0) {
      console.log('\nDetalhes das campanhas:');
      campaigns.forEach(campaign => {
        console.log(`- ID: ${campaign._id}`);
        console.log(`  campaignID: ${campaign.campaignID || 'não definido'}`);
        console.log(`  Nome: ${campaign.name}`);
        console.log(`  externalId: ${campaign.externalId}`);
        console.log(`  Conta: ${campaign.account ? campaign.account.name : 'N/A'}`);
        console.log('---');
      });
    }
    
    // Listar contas do usuário
    const accounts = await Account.find({ userId })
      .select('_id name provider accountID');
    
    console.log(`\nContas para o usuário ${userId}: ${accounts.length}`);
    
    if (accounts.length > 0) {
      console.log('\nDetalhes das contas:');
      accounts.forEach(account => {
        console.log(`- ID: ${account._id}`);
        console.log(`  accountID: ${account.accountID || 'não definido'}`);
        console.log(`  Nome: ${account.name}`);
        console.log(`  Provedor: ${account.provider}`);
        console.log('---');
      });
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Erro ao listar campanhas:', error);
    mongoose.connection.close();
  }
}

// Testar para o usuário "user123"
listCampaignsForUser('user123');
