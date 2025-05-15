const mongoose = require('mongoose');
const { Account } = require('./src/models');
require('dotenv').config();

async function updateAccountIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Buscar todas as contas
    const accounts = await Account.find({});
    console.log(`\nTotal de contas encontradas: ${accounts.length}`);
    
    // Atualizar cada conta com um accountID
    let updateCount = 0;
    
    for (const account of accounts) {
      // Gerar ID baseado no timestamp
      const accountID = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1000);
      
      // Atualizar diretamente no banco de dados
      await mongoose.connection.db.collection('accounts').updateOne(
        { _id: account._id },
        { $set: { accountID } }
      );
      
      console.log(`Atualizada conta "${account.name}" com accountID: ${accountID}`);
      updateCount++;
    }
    
    console.log(`\n${updateCount} contas atualizadas com sucesso!`);
    
    // Verificar se as atualizações funcionaram
    if (accounts.length > 0) {
      const firstAccount = await Account.findById(accounts[0]._id);
      console.log(`\nVerificando primeira conta depois da atualização:`);
      console.log(`- Nome: ${firstAccount.name}`);
      console.log(`- accountID: ${firstAccount.accountID}`);
      
      // Tentar buscar por accountID
      if (firstAccount.accountID) {
        console.log(`\nTentando buscar por accountID: ${firstAccount.accountID}`);
        const foundByAccountId = await Account.findOne({ accountID: firstAccount.accountID });
        console.log(`Resultado: ${foundByAccountId ? 'Encontrado!' : 'Não encontrado.'}`);
      }
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Erro:', error);
    mongoose.connection.close();
  }
}

updateAccountIds();
