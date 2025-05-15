/**
 * Script de migração para adicionar IDs numéricos sequenciais aos documentos existentes.
 * 
 * Uso: 
 * node scripts/migrations/add-numeric-ids.js
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
 * Reinicia a sequência de IDs para uma entidade
 */
async function resetCounter(entityName) {
  await Counter.findOneAndUpdate(
    { entity: entityName },
    { seq: 0 },
    { upsert: true }
  );
  console.log(`✅ Contador para ${entityName} reiniciado`);
}

/**
 * Adiciona IDs numéricos aos documentos de uma coleção
 */
async function addNumericIds(Model, idField, entityName) {
  console.log(`🔄 Migrando ${entityName}...`);
  
  // Buscar todos os documentos sem o campo ID numérico
  const documents = await Model.find({
    [idField]: { $exists: false }
  });
  
  console.log(`📊 Encontrados ${documents.length} documentos para migrar`);
  
  // Se não tiver documentos, não faz nada
  if (documents.length === 0) {
    console.log(`✅ Nenhum documento de ${entityName} para migrar`);
    return;
  }
  
  // Reiniciar o contador
  await resetCounter(entityName);
  
  // Para cada documento, adicionar o ID numérico
  for (const doc of documents) {
    const nextId = await Counter.getNextSequence(entityName);
    doc[idField] = nextId;
    
    // Se for uma entidade com relacionamentos, atualizar os IDs relacionados
    if (idField === 'campaignID' && doc.account) {
      const account = await Account.findById(doc.account);
      if (account && account.accountID) {
        doc.accountID = account.accountID;
      }
    }
    
    if (idField === 'emailID') {
      if (doc.account) {
        const account = await Account.findById(doc.account);
        if (account && account.accountID) {
          doc.accountID = account.accountID;
        }
      }
      
      if (doc.campaign) {
        const campaign = await Campaign.findById(doc.campaign);
        if (campaign && campaign.campaignID) {
          doc.campaignID = campaign.campaignID;
        }
      }
    }
    
    if (idField === 'eventID') {
      if (doc.account) {
        const account = await Account.findById(doc.account);
        if (account && account.accountID) {
          doc.accountID = account.accountID;
        }
      }
      
      if (doc.campaign) {
        const campaign = await Campaign.findById(doc.campaign);
        if (campaign && campaign.campaignID) {
          doc.campaignID = campaign.campaignID;
        }
      }
      
      if (doc.email) {
        const email = await Email.findById(doc.email);
        if (email && email.emailID) {
          doc.emailID = email.emailID;
        }
      }
    }
    
    if (idField === 'metricsID') {
      if (doc.account) {
        const account = await Account.findById(doc.account);
        if (account && account.accountID) {
          doc.accountID = account.accountID;
        }
      }
      
      if (doc.campaign) {
        const campaign = await Campaign.findById(doc.campaign);
        if (campaign && campaign.campaignID) {
          doc.campaignID = campaign.campaignID;
        }
      }
      
      if (doc.email) {
        const email = await Email.findById(doc.email);
        if (email && email.emailID) {
          doc.emailID = email.emailID;
        }
      }
    }
    
    await doc.save();
    
    // Log a cada 100 documentos
    if (nextId % 100 === 0) {
      console.log(`🔄 Migrados ${nextId} documentos de ${entityName}...`);
    }
  }
  
  console.log(`✅ Migração de ${entityName} concluída! Total: ${documents.length} documentos`);
}

/**
 * Função principal da migração
 */
async function runMigration() {
  try {
    console.log('🚀 Iniciando migração para adicionar IDs numéricos...');
    
    // Adicionar accountID aos documentos Account (primeiro, pois outros dependem dele)
    await addNumericIds(Account, 'accountID', 'Account');
    
    // Adicionar campaignID aos documentos Campaign
    await addNumericIds(Campaign, 'campaignID', 'Campaign');
    
    // Adicionar emailID aos documentos Email
    await addNumericIds(Email, 'emailID', 'Email');
    
    // Adicionar eventID aos documentos Event
    await addNumericIds(Event, 'eventID', 'Event');
    
    // Adicionar metricsID aos documentos Metrics
    await addNumericIds(Metrics, 'metricsID', 'Metrics');
    
    console.log('🎉 Migração concluída com sucesso!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Executar a migração
runMigration();
