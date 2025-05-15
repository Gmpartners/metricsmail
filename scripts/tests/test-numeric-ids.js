/**
 * Script para testar a implementação dos IDs numéricos
 * Este script:
 * 1. Conecta ao banco de dados
 * 2. Verifica se todos os documentos possuem os campos de ID numéricos
 * 3. Testa a criação de novos documentos com geração automática de IDs
 * 4. Testa algumas consultas usando os novos campos ID
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Importar modelos após carregar as variáveis de ambiente
const { Account, Campaign, Email, Event, Metrics, Counter } = require('../../src/models');

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => {
  console.error('❌ Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

/**
 * Verificar se todos os documentos de uma coleção possuem o campo ID numérico
 */
async function validateCollection(Model, idField, collectionName) {
  console.log(`\n🔍 Validando coleção ${collectionName}...`);
  
  // Contar total de documentos
  const totalCount = await Model.countDocuments();
  console.log(`📊 Total de documentos: ${totalCount}`);
  
  // Contar documentos com o campo ID
  const withIdCount = await Model.countDocuments({ [idField]: { $exists: true } });
  console.log(`📊 Documentos com ${idField}: ${withIdCount}`);
  
  // Contar documentos sem o campo ID
  const withoutIdCount = await Model.countDocuments({ [idField]: { $exists: false } });
  console.log(`📊 Documentos sem ${idField}: ${withoutIdCount}`);
  
  // Listar alguns IDs para verificar
  const sampleDocs = await Model.find({ [idField]: { $exists: true } })
                              .limit(5)
                              .select(`_id ${idField}`);
  
  console.log(`📋 Amostra de documentos (${sampleDocs.length}):`);
  sampleDocs.forEach(doc => {
    console.log(`   - _id: ${doc._id}, ${idField}: ${doc[idField]}`);
  });
  
  // Verificar se todos os IDs são únicos
  const allIds = await Model.distinct(idField);
  const uniqueIds = new Set(allIds);
  
  if (allIds.length !== uniqueIds.size) {
    console.error(`❌ ERRO: Existem IDs duplicados em ${collectionName}!`);
    // Encontrar IDs duplicados
    const idCounts = {};
    allIds.forEach(id => {
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    
    const duplicates = Object.entries(idCounts)
                             .filter(([id, count]) => count > 1)
                             .map(([id, count]) => `${id} (${count} ocorrências)`);
    
    console.error(`   IDs duplicados: ${duplicates.join(', ')}`);
  } else {
    console.log(`✅ Todos os ${allIds.length} IDs são únicos.`);
  }
  
  return {
    totalCount,
    withIdCount,
    withoutIdCount,
    isValid: withIdCount === totalCount && allIds.length === uniqueIds.size
  };
}

/**
 * Testar a criação de um novo documento com geração automática de ID
 */
async function testDocumentCreation(Model, createData, idField, collectionName) {
  console.log(`\n🧪 Testando criação de novo documento em ${collectionName}...`);
  
  try {
    // Criar novo documento
    const newDoc = new Model(createData);
    await newDoc.save();
    
    console.log(`✅ Documento criado com sucesso!`);
    console.log(`   - _id: ${newDoc._id}`);
    console.log(`   - ${idField}: ${newDoc[idField]}`);
    
    // Verificar se o contador foi incrementado
    const counter = await Counter.findOne({ entity: collectionName });
    console.log(`   - Contador atual para ${collectionName}: ${counter.seq}`);
    
    // Remover documento de teste
    await Model.deleteOne({ _id: newDoc._id });
    console.log(`🧹 Documento de teste removido.`);
    
    return true;
  } catch (error) {
    console.error(`❌ Erro ao criar documento: ${error.message}`);
    return false;
  }
}

/**
 * Testar consultas usando os novos campos ID
 */
async function testQueries() {
  console.log(`\n🧪 Testando consultas com novos campos ID...`);
  
  try {
    // 1. Buscar uma conta pelo accountID
    const randomAccount = await Account.findOne()
                                     .select('_id accountID name');
    
    if (!randomAccount) {
      console.log(`⚠️ Não foi possível encontrar uma conta para testar.`);
      return false;
    }
    
    console.log(`🔍 Buscando conta com accountID = ${randomAccount.accountID}...`);
    const accountById = await Account.findOne({ accountID: randomAccount.accountID });
    
    if (accountById && accountById._id.toString() === randomAccount._id.toString()) {
      console.log(`✅ Conta encontrada com sucesso! Nome: ${accountById.name}`);
    } else {
      console.error(`❌ Erro: Conta não encontrada ou ID incorreto!`);
      return false;
    }
    
    // 2. Buscar campanhas de uma conta pelo accountID
    console.log(`🔍 Buscando campanhas com accountID = ${randomAccount.accountID}...`);
    const campaigns = await Campaign.find({ accountID: randomAccount.accountID })
                                   .select('campaignID name')
                                   .limit(3);
    
    console.log(`✅ ${campaigns.length} campanhas encontradas:`);
    campaigns.forEach(campaign => {
      console.log(`   - campaignID: ${campaign.campaignID}, Nome: ${campaign.name}`);
    });
    
    // 3. Testar buscas combinadas se tiver campanhas
    if (campaigns.length > 0) {
      const randomCampaign = campaigns[0];
      
      console.log(`🔍 Buscando emails com campaignID = ${randomCampaign.campaignID}...`);
      const emails = await Email.find({ campaignID: randomCampaign.campaignID })
                               .select('emailID subject')
                               .limit(3);
      
      console.log(`✅ ${emails.length} emails encontrados.`);
      
      if (emails.length > 0) {
        const randomEmail = emails[0];
        
        console.log(`🔍 Buscando eventos com emailID = ${randomEmail.emailID}...`);
        const events = await Event.find({ emailID: randomEmail.emailID })
                                 .select('eventID eventType timestamp')
                                 .limit(5);
        
        console.log(`✅ ${events.length} eventos encontrados.`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Erro ao realizar consultas: ${error.message}`);
    return false;
  }
}

/**
 * Função principal de teste
 */
async function runTests() {
  try {
    console.log('🚀 Iniciando testes de IDs numéricos...');
    
    // 1. Validar coleções
    const accountValidation = await validateCollection(Account, 'accountID', 'Account');
    const campaignValidation = await validateCollection(Campaign, 'campaignID', 'Campaign');
    const emailValidation = await validateCollection(Email, 'emailID', 'Email');
    const eventValidation = await validateCollection(Event, 'eventID', 'Event');
    const metricsValidation = await validateCollection(Metrics, 'metricsID', 'Metrics');
    
    // 2. Testar criação de documentos (opcional, depende de dados de teste disponíveis)
    // Criar dados de teste para Account
    const randomUserId = `test-user-${Date.now()}`;
    
    const testAccountData = {
      userId: randomUserId,
      name: `Test Account ${Date.now()}`,
      provider: 'mautic',
      status: 'active',
      mautic: {
        url: 'https://test.mautic.com',
        username: 'test',
        password: 'test123'
      }
    };
    
    await testDocumentCreation(Account, testAccountData, 'accountID', 'Account');
    
    // 3. Testar consultas
    await testQueries();
    
    // Resumo final
    console.log('\n📋 RESUMO DOS TESTES:');
    console.log(`✅ Account: ${accountValidation.isValid ? 'Válido' : 'Inválido'} (${accountValidation.withIdCount}/${accountValidation.totalCount})`);
    console.log(`✅ Campaign: ${campaignValidation.isValid ? 'Válido' : 'Inválido'} (${campaignValidation.withIdCount}/${campaignValidation.totalCount})`);
    console.log(`✅ Email: ${emailValidation.isValid ? 'Válido' : 'Inválido'} (${emailValidation.withIdCount}/${emailValidation.totalCount})`);
    console.log(`✅ Event: ${eventValidation.isValid ? 'Válido' : 'Inválido'} (${eventValidation.withIdCount}/${eventValidation.totalCount})`);
    console.log(`✅ Metrics: ${metricsValidation.isValid ? 'Válido' : 'Inválido'} (${metricsValidation.withIdCount}/${metricsValidation.totalCount})`);
    
    console.log('\n🎉 Testes concluídos!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Executar os testes
runTests();
