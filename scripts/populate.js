#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
const Account = require('../src/models/accountModel');
const Campaign = require('../src/models/campaignModel');
const Email = require('../src/models/emailModel');
const Event = require('../src/models/eventModel');
const Metrics = require('../src/models/metricsModel');

// Configurações do período de dados
const START_DATE = new Date('2025-05-17T00:00:00.000Z');
const END_DATE = new Date('2025-05-22T23:59:59.999Z');

// Templates de campanhas realistas
const CAMPAIGN_TEMPLATES = [
  {
    name: 'Newsletter Semanal - Maio 2025',
    description: 'Newsletter com as principais novidades e atualizações da semana',
    status: 'sent',
    tags: ['newsletter', 'semanal']
  },
  {
    name: 'Promoção Flash - Desconto 30%',
    description: 'Campanha promocional com desconto especial por tempo limitado',
    status: 'sent',
    tags: ['promocao', 'desconto']
  },
  {
    name: 'Conteúdo Educativo - Dicas do Setor',
    description: 'Série educativa com dicas e insights do mercado',
    status: 'sent',
    tags: ['educativo', 'dicas']
  },
  {
    name: 'Convite para Webinar',
    description: 'Convite para participar do webinar sobre tendências 2025',
    status: 'sent',
    tags: ['webinar', 'evento']
  },
  {
    name: 'Pesquisa de Satisfação',
    description: 'Pesquisa para coletar feedback dos nossos clientes',
    status: 'sent',
    tags: ['pesquisa', 'feedback']
  }
];

// Templates de emails
const EMAIL_TEMPLATES = [
  {
    name: 'Newsletter Template',
    subject: '📧 Novidades da Semana - Não Perca!',
    fromName: 'Equipe Newsletter',
    htmlContent: '<h1>Newsletter Semanal</h1><p>Confira as principais novidades desta semana...</p>'
  },
  {
    name: 'Promoção Flash',
    subject: '⚡ FLASH: 30% OFF - Apenas por 24h!',
    fromName: 'Ofertas Especiais',
    htmlContent: '<h1>Promoção Imperdível!</h1><p>Aproveite 30% de desconto em toda loja...</p>'
  },
  {
    name: 'Dicas Educativas',
    subject: '💡 5 Dicas que Vão Transformar Seu Negócio',
    fromName: 'Conteúdo Educativo',
    htmlContent: '<h1>Dicas Valiosas</h1><p>Preparamos 5 dicas essenciais para você...</p>'
  },
  {
    name: 'Convite Webinar',
    subject: '🎯 Você está convidado: Webinar Gratuito',
    fromName: 'Eventos',
    htmlContent: '<h1>Webinar Exclusivo</h1><p>Participe do nosso webinar sobre tendências...</p>'
  },
  {
    name: 'Pesquisa NPS',
    subject: '⭐ Sua opinião é importante - 2 minutos',
    fromName: 'Pesquisa',
    htmlContent: '<h1>Conte sua experiência</h1><p>Queremos saber como foi sua experiência...</p>'
  }
];

// Lista de domínios de email realistas
const EMAIL_DOMAINS = [
  'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'uol.com.br',
  'terra.com.br', 'globo.com', 'ig.com.br', 'bol.com.br', 'empresa.com.br'
];

// Função para gerar emails aleatórios
function generateRandomEmail() {
  const names = ['joao', 'maria', 'pedro', 'ana', 'carlos', 'lucia', 'bruno', 'patricia', 'rodrigo', 'fernanda'];
  const surnames = ['silva', 'santos', 'oliveira', 'souza', 'pereira', 'costa', 'ferreira', 'almeida', 'barbosa', 'ribeiro'];
  const name = names[Math.floor(Math.random() * names.length)];
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  return `${name}.${surname}${Math.floor(Math.random() * 100)}@${domain}`;
}

// Função para gerar timestamp aleatório dentro do período
function generateRandomTimestamp(baseDate = null) {
  const start = baseDate || START_DATE;
  const end = baseDate ? new Date(baseDate.getTime() + 24 * 60 * 60 * 1000) : END_DATE;
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Função para gerar métricas realistas
function generateRealisticMetrics(sentCount) {
  const deliveredCount = Math.floor(sentCount * (0.92 + Math.random() * 0.06)); // 92-98% delivery
  const openCount = Math.floor(deliveredCount * (0.15 + Math.random() * 0.25)); // 15-40% open rate
  const uniqueOpenCount = Math.floor(openCount * (0.7 + Math.random() * 0.25)); // 70-95% unique opens
  const clickCount = Math.floor(openCount * (0.02 + Math.random() * 0.08)); // 2-10% click rate
  const uniqueClickCount = Math.floor(clickCount * (0.8 + Math.random() * 0.15)); // 80-95% unique clicks
  const bounceCount = sentCount - deliveredCount;
  const unsubscribeCount = Math.floor(deliveredCount * (0.001 + Math.random() * 0.004)); // 0.1-0.5% unsubscribe
  const complaintCount = Math.floor(deliveredCount * (0.0001 + Math.random() * 0.0009)); // 0.01-0.1% complaint

  return {
    sentCount,
    deliveredCount,
    openCount,
    uniqueOpenCount,
    clickCount,
    uniqueClickCount,
    bounceCount,
    unsubscribeCount,
    complaintCount
  };
}

// Função principal para popular dados
async function populateUserData(userId) {
  try {
    console.log(`🚀 Iniciando população de dados para userId: ${userId}`);
    
    // Buscar contas do usuário
    const accounts = await Account.find({ userId }).exec();
    
    if (accounts.length === 0) {
      console.log(`❌ Nenhuma conta encontrada para o userId: ${userId}`);
      return;
    }

    console.log(`📊 Encontradas ${accounts.length} conta(s) para o usuário`);

    for (const account of accounts) {
      console.log(`\n🏢 Processando conta: ${account.name} (${account.provider})`);
      
      // Limpar dados existentes do período para esta conta
      await cleanExistingData(userId, account._id);
      
      // Popular dados para cada dia do período
      const currentDate = new Date(START_DATE);
      const campaigns = [];
      
      while (currentDate <= END_DATE) {
        console.log(`📅 Populando dados para: ${currentDate.toISOString().split('T')[0]}`);
        
        // Decidir quantas campanhas criar neste dia (0-2)
        const campaignsToday = Math.floor(Math.random() * 3);
        
        for (let i = 0; i < campaignsToday; i++) {
          const campaign = await createCampaign(userId, account, currentDate);
          campaigns.push(campaign);
          
          const email = await createEmail(userId, account, campaign);
          await createEventsForEmail(userId, account, campaign, email, currentDate);
        }
        
        // Avançar para o próximo dia
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calcular métricas agregadas para cada dia
      await calculateDailyMetrics(userId, account._id, campaigns);
      
      console.log(`✅ Conta ${account.name} processada com sucesso!`);
    }

    console.log(`\n🎉 Population de dados concluída para userId: ${userId}`);
    
  } catch (error) {
    console.error('❌ Erro ao popular dados:', error);
    throw error;
  }
}

// Função para limpar dados existentes
async function cleanExistingData(userId, accountId) {
  console.log('🧹 Limpando dados existentes do período...');
  
  // Buscar campanhas do período para excluir dados relacionados
  const campaigns = await Campaign.find({
    userId,
    account: accountId,
    createdAt: { $gte: START_DATE, $lte: END_DATE }
  }).select('_id');
  
  const campaignIds = campaigns.map(c => c._id);

  // Excluir em ordem para manter integridade
  if (campaignIds.length > 0) {
    await Event.deleteMany({ userId, campaign: { $in: campaignIds } });
    await Email.deleteMany({ userId, campaign: { $in: campaignIds } });
    await Metrics.deleteMany({ userId, campaign: { $in: campaignIds } });
  }
  
  await Campaign.deleteMany({
    userId,
    account: accountId,
    createdAt: { $gte: START_DATE, $lte: END_DATE }
  });

  // Limpar métricas por conta do período
  await Metrics.deleteMany({
    userId,
    account: accountId,
    date: { $gte: START_DATE, $lte: END_DATE }
  });
}

// Função para criar campanha
async function createCampaign(userId, account, date) {
  const template = CAMPAIGN_TEMPLATES[Math.floor(Math.random() * CAMPAIGN_TEMPLATES.length)];
  const sentDate = generateRandomTimestamp(date);
  
  const campaign = new Campaign({
    userId,
    name: `${template.name} - ${date.toISOString().split('T')[0]}`,
    description: template.description,
    account: account._id,
    externalId: `mautic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: template.status,
    scheduledDate: new Date(sentDate.getTime() - 60 * 60 * 1000), // 1h antes
    sentDate: sentDate,
    tags: template.tags,
    metadata: {
      provider: account.provider,
      originalId: Math.floor(Math.random() * 10000)
    }
  });

  await campaign.save();
  return campaign;
}

// Função para criar email
async function createEmail(userId, account, campaign) {
  const template = EMAIL_TEMPLATES[Math.floor(Math.random() * EMAIL_TEMPLATES.length)];
  
  const email = new Email({
    userId,
    account: account._id,
    campaign: campaign._id,
    name: template.name,
    subject: template.subject,
    fromName: template.fromName,
    fromEmail: `noreply@${account.url.replace(/^https?:\/\//, '')}`,
    replyTo: `reply@${account.url.replace(/^https?:\/\//, '')}`,
    textContent: template.htmlContent.replace(/<[^>]*>/g, ''),
    htmlContent: template.htmlContent,
    externalId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    provider: account.provider,
    metadata: {
      templateId: Math.floor(Math.random() * 1000)
    }
  });

  await email.save();
  return email;
}

// Função para criar eventos para um email
async function createEventsForEmail(userId, account, campaign, email, baseDate) {
  const recipientsCount = 500 + Math.floor(Math.random() * 2000); // 500-2500 recipients
  const metrics = generateRealisticMetrics(recipientsCount);
  
  const contacts = [];
  const eventsToCreate = [];
  
  // Gerar lista de contatos únicos
  for (let i = 0; i < recipientsCount; i++) {
    contacts.push({
      email: generateRandomEmail(),
      id: `contact_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`
    });
  }

  // Criar eventos de envio para todos
  for (let i = 0; i < metrics.sentCount; i++) {
    const contact = contacts[i];
    const timestamp = generateRandomTimestamp(baseDate);
    
    eventsToCreate.push({
      userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'send',
      timestamp,
      contactEmail: contact.email,
      contactId: contact.id,
      provider: account.provider,
      externalId: `send_${timestamp.getTime()}_${i}`,
      isFirstInteraction: true,
      uniqueIdentifier: `${contact.id}_${email._id}_send`,
      metadata: { batchId: Math.floor(i / 100) }
    });
  }

  // Criar eventos de entrega
  for (let i = 0; i < metrics.deliveredCount; i++) {
    const contact = contacts[i];
    const sendEvent = eventsToCreate.find(e => e.contactId === contact.id && e.eventType === 'send');
    const timestamp = new Date(sendEvent.timestamp.getTime() + Math.random() * 300000); // 0-5min após envio
    
    eventsToCreate.push({
      userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'delivery',
      timestamp,
      contactEmail: contact.email,
      contactId: contact.id,
      provider: account.provider,
      externalId: `delivery_${timestamp.getTime()}_${i}`,
      isFirstInteraction: true,
      uniqueIdentifier: `${contact.id}_${email._id}_delivery`
    });
  }

  // Criar eventos de abertura
  const openedContacts = new Set();
  for (let i = 0; i < metrics.openCount; i++) {
    const contactIndex = Math.floor(Math.random() * metrics.deliveredCount);
    const contact = contacts[contactIndex];
    const deliveryEvent = eventsToCreate.find(e => e.contactId === contact.id && e.eventType === 'delivery');
    const timestamp = new Date(deliveryEvent.timestamp.getTime() + Math.random() * 86400000); // até 24h após entrega
    
    const isFirstOpen = !openedContacts.has(contact.id);
    if (isFirstOpen) openedContacts.add(contact.id);
    
    eventsToCreate.push({
      userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'open',
      timestamp,
      contactEmail: contact.email,
      contactId: contact.id,
      provider: account.provider,
      externalId: `open_${timestamp.getTime()}_${i}`,
      isFirstInteraction: isFirstOpen,
      uniqueIdentifier: isFirstOpen ? `${contact.id}_${email._id}_open_unique` : undefined,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
  }

  // Criar eventos de clique
  const clickedContacts = new Set();
  const openContactsArray = Array.from(openedContacts);
  for (let i = 0; i < metrics.clickCount; i++) {
    const contactId = openContactsArray[Math.floor(Math.random() * openContactsArray.length)];
    const contact = contacts.find(c => c.id === contactId);
    const openEvent = eventsToCreate.find(e => e.contactId === contactId && e.eventType === 'open');
    const timestamp = new Date(openEvent.timestamp.getTime() + Math.random() * 3600000); // até 1h após abertura
    
    const isFirstClick = !clickedContacts.has(contactId);
    if (isFirstClick) clickedContacts.add(contactId);
    
    eventsToCreate.push({
      userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'click',
      timestamp,
      contactEmail: contact.email,
      contactId: contactId,
      provider: account.provider,
      externalId: `click_${timestamp.getTime()}_${i}`,
      isFirstInteraction: isFirstClick,
      uniqueIdentifier: isFirstClick ? `${contactId}_${email._id}_click_unique` : undefined,
      url: 'https://exemplo.com/link-campanha',
      urlId: 'link_' + Math.floor(Math.random() * 10),
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
  }

  // Criar eventos de bounce
  for (let i = metrics.deliveredCount; i < metrics.sentCount; i++) {
    const contact = contacts[i];
    const sendEvent = eventsToCreate.find(e => e.contactId === contact.id && e.eventType === 'send');
    const timestamp = new Date(sendEvent.timestamp.getTime() + Math.random() * 3600000); // até 1h após envio
    
    eventsToCreate.push({
      userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'bounce',
      timestamp,
      contactEmail: contact.email,
      contactId: contact.id,
      provider: account.provider,
      externalId: `bounce_${timestamp.getTime()}_${i}`,
      isFirstInteraction: true,
      uniqueIdentifier: `${contact.id}_${email._id}_bounce`,
      bounceType: Math.random() > 0.3 ? 'hard' : 'soft',
      bounceReason: Math.random() > 0.5 ? 'User unknown' : 'Mailbox full'
    });
  }

  // Criar alguns eventos de unsubscribe
  const deliveredContactsArray = contacts.slice(0, metrics.deliveredCount);
  for (let i = 0; i < metrics.unsubscribeCount; i++) {
    const contact = deliveredContactsArray[Math.floor(Math.random() * deliveredContactsArray.length)];
    const deliveryEvent = eventsToCreate.find(e => e.contactId === contact.id && e.eventType === 'delivery');
    const timestamp = new Date(deliveryEvent.timestamp.getTime() + Math.random() * 172800000); // até 48h após entrega
    
    eventsToCreate.push({
      userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'unsubscribe',
      timestamp,
      contactEmail: contact.email,
      contactId: contact.id,
      provider: account.provider,
      externalId: `unsubscribe_${timestamp.getTime()}_${i}`,
      isFirstInteraction: true,
      uniqueIdentifier: `${contact.id}_${email._id}_unsubscribe`
    });
  }

  // Criar alguns eventos de complaint
  for (let i = 0; i < metrics.complaintCount; i++) {
    const contact = deliveredContactsArray[Math.floor(Math.random() * deliveredContactsArray.length)];
    const deliveryEvent = eventsToCreate.find(e => e.contactId === contact.id && e.eventType === 'delivery');
    const timestamp = new Date(deliveryEvent.timestamp.getTime() + Math.random() * 86400000); // até 24h após entrega
    
    eventsToCreate.push({
      userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'complaint',
      timestamp,
      contactEmail: contact.email,
      contactId: contact.id,
      provider: account.provider,
      externalId: `complaint_${timestamp.getTime()}_${i}`,
      isFirstInteraction: true,
      uniqueIdentifier: `${contact.id}_${email._id}_complaint`
    });
  }

  // Salvar todos os eventos em lotes
  const batchSize = 1000;
  for (let i = 0; i < eventsToCreate.length; i += batchSize) {
    const batch = eventsToCreate.slice(i, i + batchSize);
    await Event.insertMany(batch, { ordered: false });
  }

  // Atualizar métricas da campanha e email
  await Campaign.findByIdAndUpdate(campaign._id, {
    'metrics.recipientsCount': recipientsCount,
    'metrics.sentCount': metrics.sentCount,
    'metrics.deliveredCount': metrics.deliveredCount,
    'metrics.openCount': metrics.openCount,
    'metrics.clickCount': metrics.clickCount,
    'metrics.bounceCount': metrics.bounceCount,
    'metrics.unsubscribeCount': metrics.unsubscribeCount,
    'metrics.complaintCount': metrics.complaintCount
  });

  await Email.findByIdAndUpdate(email._id, {
    'metrics.recipientsCount': recipientsCount,
    'metrics.sentCount': metrics.sentCount,
    'metrics.deliveredCount': metrics.deliveredCount,
    'metrics.openCount': metrics.openCount,
    'metrics.uniqueOpenCount': metrics.uniqueOpenCount,
    'metrics.clickCount': metrics.clickCount,
    'metrics.uniqueClickCount': metrics.uniqueClickCount,
    'metrics.bounceCount': metrics.bounceCount,
    'metrics.unsubscribeCount': metrics.unsubscribeCount,
    'metrics.complaintCount': metrics.complaintCount
  });

  console.log(`  📧 Email "${email.name}" criado com ${recipientsCount} destinatários e ${eventsToCreate.length} eventos`);
}

// Função para calcular métricas diárias
async function calculateDailyMetrics(userId, accountId, campaigns) {
  console.log('📊 Calculando métricas diárias...');
  
  const currentDate = new Date(START_DATE);
  
  while (currentDate <= END_DATE) {
    // Calcular métricas para a conta toda neste dia
    await Metrics.calculateAndSave({
      userId,
      account: accountId,
      date: currentDate,
      period: 'day'
    });
    
    // Calcular métricas para cada campanha neste dia
    const daysCampaigns = campaigns.filter(c => 
      c.sentDate && 
      c.sentDate.toDateString() === currentDate.toDateString()
    );
    
    for (const campaign of daysCampaigns) {
      await Metrics.calculateAndSave({
        userId,
        account: accountId,
        campaign: campaign._id,
        date: currentDate,
        period: 'day'
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// Função principal
async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Uso: node populate.js {userId}');
    console.error('   Exemplo: node populate.js user123456');
    process.exit(1);
  }

  try {
    // Conectar ao MongoDB
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado ao MongoDB');

    // Popular dados
    await populateUserData(userId);

    console.log('\n📋 Resumo da população:');
    console.log(`📅 Período: ${START_DATE.toISOString().split('T')[0]} a ${END_DATE.toISOString().split('T')[0]}`);
    console.log(`👤 UserId: ${userId}`);
    
    // Mostrar estatísticas finais
    const campaigns = await Campaign.countDocuments({ userId, createdAt: { $gte: START_DATE, $lte: END_DATE } });
    const emails = await Email.countDocuments({ userId, createdAt: { $gte: START_DATE, $lte: END_DATE } });
    const events = await Event.countDocuments({ userId, timestamp: { $gte: START_DATE, $lte: END_DATE } });
    const metrics = await Metrics.countDocuments({ userId, date: { $gte: START_DATE, $lte: END_DATE } });
    
    console.log(`📊 Campanhas criadas: ${campaigns}`);
    console.log(`📧 Emails criados: ${emails}`);
    console.log(`🎯 Eventos criados: ${events}`);
    console.log(`📈 Métricas calculadas: ${metrics}`);

  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB fechada');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { populateUserData };
