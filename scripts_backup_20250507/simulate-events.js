require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('../src/models/accountModel');
const Campaign = require('../src/models/campaignModel');
const Email = require('../src/models/emailModel');
const Event = require('../src/models/eventModel');
const { v4: uuidv4 } = require('uuid');

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {});
    console.log('Conexão com MongoDB estabelecida');
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  }
};

// Função para gerar data aleatória nos últimos 7 dias
function randomDate(days = 7) {
  const now = new Date();
  const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return new Date(daysAgo.getTime() + Math.random() * (now.getTime() - daysAgo.getTime()));
}

// Função para simular eventos
const simulateEvents = async () => {
  try {
    // Conectar ao banco de dados
    await connectDB();
    
    // Buscar a conta Mautic
    const account = await Account.findOne({ provider: 'mautic' });
    if (!account) {
      console.error('Nenhuma conta Mautic encontrada');
      process.exit(1);
    }
    
    console.log(`Conta encontrada: ${account.name} (${account._id})`);
    
    // Criar uma campanha simulada
    let campaign = await Campaign.findOne({ account: account._id });
    if (!campaign) {
      campaign = new Campaign({
        userId: account.userId,
        account: account._id,
        name: 'Campanha de Teste',
        externalId: 'test-campaign-' + Date.now(),
        provider: 'mautic',
        status: 'active'
      });
      await campaign.save();
      console.log(`Campanha criada: ${campaign.name} (${campaign._id})`);
    } else {
      console.log(`Campanha encontrada: ${campaign.name} (${campaign._id})`);
    }
    
    // Criar um email simulado
    let email = await Email.findOne({ campaign: campaign._id });
    if (!email) {
      email = new Email({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        name: 'Email de Teste',
        subject: 'Teste de Métricas',
        externalId: 'test-email-' + Date.now(),
        provider: 'mautic',
        status: 'sent'
      });
      await email.save();
      console.log(`Email criado: ${email.name} (${email._id})`);
    } else {
      console.log(`Email encontrado: ${email.name} (${email._id})`);
    }
    
    // Gerar contatos aleatórios
    const contacts = [];
    for (let i = 1; i <= 20; i++) {
      contacts.push({
        id: `contact-${i}`,
        email: `teste${i}@exemplo.com`
      });
    }
    
    // Simular 20 eventos de envio
    console.log('Simulando 20 envios...');
    for (let i = 0; i < 20; i++) {
      const contact = contacts[i % contacts.length];
      const event = new Event({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        email: email._id,
        eventType: 'send',
        timestamp: randomDate(),
        contactEmail: contact.email,
        contactId: contact.id,
        provider: 'mautic',
        externalId: `send-${uuidv4()}`,
        isFirstInteraction: true,
        uniqueIdentifier: `send-${contact.id}-${email._id}`
      });
      await event.save();
    }
    
    // Simular 3 eventos de abertura (apenas para os 3 primeiros contatos)
    console.log('Simulando 3 aberturas...');
    for (let i = 0; i < 3; i++) {
      const contact = contacts[i];
      const event = new Event({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        email: email._id,
        eventType: 'open',
        timestamp: randomDate(),
        contactEmail: contact.email,
        contactId: contact.id,
        provider: 'mautic',
        externalId: `open-${uuidv4()}`,
        isFirstInteraction: true,
        uniqueIdentifier: `open-${contact.id}-${email._id}`
      });
      await event.save();
    }
    
    // Simular 10 eventos de clique (distribuídos entre 5 contatos)
    console.log('Simulando 10 cliques...');
    for (let i = 0; i < 10; i++) {
      // Usar apenas os primeiros 5 contatos para cliques
      const contact = contacts[i % 5];
      const event = new Event({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        email: email._id,
        eventType: 'click',
        timestamp: randomDate(),
        contactEmail: contact.email,
        contactId: contact.id,
        provider: 'mautic',
        externalId: `click-${uuidv4()}`,
        isFirstInteraction: i < 5, // Apenas a primeira interação para cada contato
        uniqueIdentifier: `click-${contact.id}-${email._id}-${i}`,
        url: 'https://exemplo.com/landing-page',
        urlId: 'landing-page'
      });
      await event.save();
    }
    
    console.log('Eventos simulados com sucesso!');
    
    // Desconectar do banco de dados
    await mongoose.disconnect();
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
};

// Executar a simulação
simulateEvents();
