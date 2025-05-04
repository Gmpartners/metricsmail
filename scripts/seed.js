require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/databaseConfig');
const { Account, Campaign, Email, Event, Metrics } = require('../src/models');
const dateHelpers = require('../src/utils/dateHelpersUtil');

// Função para gerar um número aleatório dentro de um intervalo
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// Função para gerar um email aleatório
const randomEmail = () => {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'example.com'];
  const names = ['john', 'mary', 'alex', 'jane', 'robert', 'lisa', 'michael', 'susan', 'david', 'amanda'];
  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${name}${randomInt(1, 999)}@${domain}`;
};

// Função para gerar uma data aleatória dentro de um intervalo
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Limpar o banco de dados (cuidado!)
const clearDatabase = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.log('Esta operação só pode ser realizada em ambiente de desenvolvimento!');
    process.exit(1);
  }
  
  console.log('🗑️ Limpando banco de dados...');
  
  await Account.deleteMany({});
  await Campaign.deleteMany({});
  await Email.deleteMany({});
  await Event.deleteMany({});
  await Metrics.deleteMany({});
  
  console.log('✅ Banco de dados limpo!');
};

// Criar contas de teste
const createAccounts = async () => {
  console.log('👤 Criando contas de teste...');
  
  // Usuários de teste - diferenciando por cliente
  const testUserIds = ['user1', 'user2', 'user3'];
  
  const accounts = [];
  
  // Para cada usuário, criar algumas contas
  for (const userId of testUserIds) {
    accounts.push(
      {
        userId,
        name: `Marketing Corporativo - ${userId}`,
        provider: 'mautic',
        url: 'https://mautic.example.com',
        credentials: {
          username: 'admin',
          password: 'password123'
        },
        status: 'active',
        isConnected: true
      },
      {
        userId,
        name: `Campanhas de Produto - ${userId}`,
        provider: 'mautic',
        url: 'https://mautic2.example.com',
        credentials: {
          username: 'admin2',
          password: 'password456'
        },
        status: 'active',
        isConnected: true
      },
      {
        userId,
        name: `Newsletter Mensal - ${userId}`,
        provider: 'mautic',
        url: 'https://mautic3.example.com',
        credentials: {
          username: 'admin3',
          password: 'password789'
        },
        status: 'inactive',
        isConnected: false
      }
    );
  }
  
  const createdAccounts = await Account.insertMany(accounts);
  console.log(`✅ ${createdAccounts.length} contas criadas!`);
  
  return createdAccounts;
};

// Criar campanhas de teste
const createCampaigns = async (accounts) => {
  console.log('📧 Criando campanhas de teste...');
  
  const campaigns = [];
  const status = ['draft', 'scheduled', 'sending', 'sent', 'paused'];
  const now = new Date();
  
  // Para cada conta, criar algumas campanhas
  for (const account of accounts) {
    const numCampaigns = randomInt(2, 5);
    const userId = account.userId; // Obter o userId da conta
    
    for (let i = 1; i <= numCampaigns; i++) {
      const sentDate = i <= numCampaigns - 1 ? randomDate(dateHelpers.subDays(now, 90), now) : null;
      const metrics = {
        recipientsCount: randomInt(1000, 5000),
        sentCount: 0,
        deliveredCount: 0,
        openCount: 0,
        clickCount: 0,
        bounceCount: 0,
        unsubscribeCount: 0,
        complaintCount: 0
      };
      
      // Para campanhas enviadas, gerar métricas realistas
      if (sentDate) {
        metrics.sentCount = metrics.recipientsCount;
        metrics.deliveredCount = Math.floor(metrics.sentCount * (randomInt(90, 99) / 100)); // 90-99% de entrega
        metrics.openCount = Math.floor(metrics.deliveredCount * (randomInt(15, 40) / 100)); // 15-40% de abertura
        metrics.clickCount = Math.floor(metrics.openCount * (randomInt(10, 30) / 100)); // 10-30% de clique
        metrics.bounceCount = metrics.sentCount - metrics.deliveredCount;
        metrics.unsubscribeCount = Math.floor(metrics.deliveredCount * (randomInt(1, 5) / 1000)); // 0.1-0.5% de descadastramento
        metrics.complaintCount = Math.floor(metrics.deliveredCount * (randomInt(1, 3) / 1000)); // 0.1-0.3% de reclamação
      }
      
      campaigns.push({
        userId, // Adicionar userId à campanha
        name: `Campanha ${i} - ${account.name}`,
        description: `Descrição da campanha ${i} para ${account.name}`,
        account: account._id,
        externalId: `ext-${account._id}-${i}`,
        status: sentDate ? 'sent' : status[randomInt(0, 1)],
        scheduledDate: sentDate ? dateHelpers.subDays(sentDate, randomInt(1, 5)) : randomDate(now, dateHelpers.addDays(now, 30)),
        sentDate,
        metrics,
        tags: ['teste', `tag-${i}`]
      });
    }
  }
  
  const createdCampaigns = await Campaign.insertMany(campaigns);
  console.log(`✅ ${createdCampaigns.length} campanhas criadas!`);
  
  return createdCampaigns;
};

// Criar emails de teste
const createEmails = async (campaigns) => {
  console.log('📋 Criando templates de email de teste...');
  
  const emails = [];
  const subjects = [
    'Novidades do mês!',
    'Oferta especial para você',
    'Não perca esta oportunidade',
    'Confira nossos produtos em destaque',
    'Newsletter mensal',
    'Descontos exclusivos para clientes'
  ];
  
  for (const campaign of campaigns) {
    // Alguns templates por campanha
    const numEmails = randomInt(1, 2);
    const userId = campaign.userId; // Obter o userId da campanha
    
    for (let i = 1; i <= numEmails; i++) {
      const metrics = {
        recipientsCount: campaign.metrics.recipientsCount / numEmails,
        sentCount: campaign.metrics.sentCount / numEmails,
        deliveredCount: campaign.metrics.deliveredCount / numEmails,
        openCount: campaign.metrics.openCount / numEmails,
        uniqueOpenCount: Math.floor(campaign.metrics.openCount / numEmails * 0.7), // 70% das aberturas são únicas
        clickCount: campaign.metrics.clickCount / numEmails,
        uniqueClickCount: Math.floor(campaign.metrics.clickCount / numEmails * 0.8), // 80% dos cliques são únicos
        bounceCount: campaign.metrics.bounceCount / numEmails,
        unsubscribeCount: campaign.metrics.unsubscribeCount / numEmails,
        complaintCount: campaign.metrics.complaintCount / numEmails
      };
      
      emails.push({
        userId, // Adicionar userId ao email
        account: campaign.account,
        campaign: campaign._id,
        subject: subjects[randomInt(0, subjects.length - 1)],
        fromName: 'Empresa Exemplo',
        fromEmail: 'marketing@example.com',
        replyTo: 'no-reply@example.com',
        textContent: 'Conteúdo de texto do email...',
        htmlContent: '<h1>Conteúdo HTML do email</h1><p>Exemplo de corpo do email...</p>',
        externalId: `email-${campaign._id}-${i}`,
        provider: 'mautic',
        metrics
      });
    }
  }
  
  const createdEmails = await Email.insertMany(emails);
  console.log(`✅ ${createdEmails.length} templates de email criados!`);
  
  return createdEmails;
};

// Criar eventos de teste
const createEvents = async (campaigns, emails) => {
  console.log('🔄 Criando eventos de teste...');
  
  // Mapeamento de emails por campanha
  const emailsByCampaign = emails.reduce((acc, email) => {
    const campaignId = email.campaign.toString();
    
    if (!acc[campaignId]) {
      acc[campaignId] = [];
    }
    
    acc[campaignId].push(email);
    
    return acc;
  }, {});
  
  const events = [];
  let totalEvents = 0;
  
  // Para cada campanha que foi enviada
  for (const campaign of campaigns.filter(c => c.sentDate)) {
    const campaignId = campaign._id.toString();
    const userId = campaign.userId; // Obter o userId da campanha
    const campaignEmails = emailsByCampaign[campaignId] || [];
    
    if (campaignEmails.length === 0) continue;
    
    // Gerar contatos para esta campanha
    const contacts = [];
    for (let i = 0; i < campaign.metrics.recipientsCount; i++) {
      contacts.push({
        email: randomEmail(),
        id: `contact-${i}-${campaignId}`,
      });
    }
    
    // Distribuir contatos entre os emails da campanha
    const contactsPerEmail = Math.floor(contacts.length / campaignEmails.length);
    
    // Para cada email, gerar eventos
    for (let emailIndex = 0; emailIndex < campaignEmails.length; emailIndex++) {
      const email = campaignEmails[emailIndex];
      const emailContacts = contacts.slice(
        emailIndex * contactsPerEmail,
        (emailIndex + 1) * contactsPerEmail
      );
      
      // Para cada contato designado para este email
      for (const contact of emailContacts) {
        const sentDate = randomDate(campaign.sentDate, dateHelpers.addDays(campaign.sentDate, 1));
        
        // Evento de envio para todos
        events.push({
          userId, // Adicionar userId ao evento
          account: campaign.account,
          campaign: campaign._id,
          email: email._id,
          eventType: 'send',
          timestamp: sentDate,
          contactEmail: contact.email,
          contactId: contact.id,
          provider: 'mautic',
          externalId: `send-${contact.id}-${email._id}`
        });
        totalEvents++;
        
        // Alguns envios podem falhar (bounce)
        const isDelivered = Math.random() > 0.05; // 5% de bounce
        
        if (!isDelivered) {
          events.push({
            userId, // Adicionar userId ao evento
            account: campaign.account,
            campaign: campaign._id,
            email: email._id,
            eventType: 'bounce',
            timestamp: dateHelpers.addDays(sentDate, randomInt(0, 1)),
            contactEmail: contact.email,
            contactId: contact.id,
            provider: 'mautic',
            externalId: `bounce-${contact.id}-${email._id}`,
            bounceType: Math.random() > 0.7 ? 'hard' : 'soft',
            bounceReason: 'Mailbox full'
          });
          totalEvents++;
          continue;
        }
        
        // Evento de entrega para a maioria
        events.push({
          userId, // Adicionar userId ao evento
          account: campaign.account,
          campaign: campaign._id,
          email: email._id,
          eventType: 'delivery',
          timestamp: dateHelpers.addDays(sentDate, randomInt(0, 1) / 24), // Alguns minutos depois
          contactEmail: contact.email,
          contactId: contact.id,
          provider: 'mautic',
          externalId: `delivery-${contact.id}-${email._id}`
        });
        totalEvents++;
        
        // Alguns são abertos
        const isOpened = Math.random() < 0.3; // 30% de abertura
        
        if (isOpened) {
          const openDate = dateHelpers.addDays(sentDate, randomInt(0, 3));
          
          events.push({
            userId, // Adicionar userId ao evento
            account: campaign.account,
            campaign: campaign._id,
            email: email._id,
            eventType: 'open',
            timestamp: openDate,
            contactEmail: contact.email,
            contactId: contact.id,
            provider: 'mautic',
            externalId: `open-${contact.id}-${email._id}`,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          });
          totalEvents++;
          
          // Alguns clicam
          const isClicked = Math.random() < 0.2; // 20% dos que abrem clicam
          
          if (isClicked) {
            const clickDate = dateHelpers.addDays(openDate, randomInt(0, 1) / 24); // Alguns minutos depois
            
            events.push({
              userId, // Adicionar userId ao evento
              account: campaign.account,
              campaign: campaign._id,
              email: email._id,
              eventType: 'click',
              timestamp: clickDate,
              contactEmail: contact.email,
              contactId: contact.id,
              provider: 'mautic',
              externalId: `click-${contact.id}-${email._id}`,
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              url: 'https://example.com/produto'
            });
            totalEvents++;
          }
          
          // Alguns cancelam a inscrição
          const isUnsubscribed = Math.random() < 0.01; // 1% dos que abrem cancelam
          
          if (isUnsubscribed) {
            const unsubDate = dateHelpers.addDays(openDate, randomInt(0, 2));
            
            events.push({
              userId, // Adicionar userId ao evento
              account: campaign.account,
              campaign: campaign._id,
              email: email._id,
              eventType: 'unsubscribe',
              timestamp: unsubDate,
              contactEmail: contact.email,
              contactId: contact.id,
              provider: 'mautic',
              externalId: `unsub-${contact.id}-${email._id}`
            });
            totalEvents++;
          }
        }
      }
    }
    
    // Para não sobrecarregar o banco de dados em desenvolvimento, limitamos o número de eventos
    if (totalEvents > 2000) {
      console.log(`🛑 Limitando a ${totalEvents} eventos para economizar recursos`);
      break;
    }
  }
  
  // Inserir eventos em lotes para não sobrecarregar a memória
  const batchSize = 500;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await Event.insertMany(batch);
    console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)} de eventos inserido`);
  }
  
  console.log(`✅ ${events.length} eventos criados!`);
  
  return events;
};

// Gerar métricas agregadas
const generateMetrics = async (accounts, campaigns) => {
  console.log('📊 Gerando métricas agregadas...');
  
  const today = new Date();
  const startDate = dateHelpers.subDays(today, 90); // 3 meses de histórico
  
  let totalMetrics = 0;
  
  // Para cada dia no intervalo
  for (let currentDate = new Date(startDate); currentDate <= today; currentDate = dateHelpers.addDays(currentDate, 1)) {
    // Para cada conta
    for (const account of accounts) {
      const userId = account.userId; // Obter o userId da conta
      
      // Métricas diárias da conta (sem campanha específica)
      await Metrics.calculateAndSave({
        userId,
        account: account._id,
        date: currentDate,
        period: 'day'
      });
      totalMetrics++;
      
      // Para cada campanha desta conta
      const accountCampaigns = campaigns.filter(c => c.account.toString() === account._id.toString());
      
      for (const campaign of accountCampaigns) {
        // Se a campanha já foi enviada nesta data
        if (campaign.sentDate && campaign.sentDate <= currentDate) {
          await Metrics.calculateAndSave({
            userId,
            account: account._id,
            campaign: campaign._id,
            date: currentDate,
            period: 'day'
          });
          totalMetrics++;
        }
      }
    }
    
    // Também geramos métricas mensais
    if (currentDate.getDate() === 1 || currentDate.getTime() === today.getTime()) {
      for (const account of accounts) {
        const userId = account.userId; // Obter o userId da conta
        
        await Metrics.calculateAndSave({
          userId,
          account: account._id,
          date: currentDate,
          period: 'month'
        });
        totalMetrics++;
      }
    }
  }
  
  console.log(`✅ ${totalMetrics} registros de métricas gerados!`);
};

// Função principal para executar o seed
const seed = async () => {
  try {
    // Conectar ao banco de dados
    await connectDB();
    
    // Limpar banco de dados
    await clearDatabase();
    
    // Criar dados de teste
    const accounts = await createAccounts();
    const campaigns = await createCampaigns(accounts);
    const emails = await createEmails(campaigns);
    const events = await createEvents(campaigns, emails);
    await generateMetrics(accounts, campaigns);
    
    console.log('✅ Seed concluído com sucesso!');
    
    // Fechar conexão com o banco de dados
    await mongoose.connection.close();
    console.log('📴 Conexão com o banco de dados fechada');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro durante o seed:', err);
    process.exit(1);
  }
};

// Executar seed
seed();