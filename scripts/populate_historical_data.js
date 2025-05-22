const mongoose = require('mongoose');
const Account = require('../src/models/accountModel');
const Campaign = require('../src/models/campaignModel');
const Email = require('../src/models/emailModel');
const Event = require('../src/models/eventModel');

// Verificar se userId foi fornecido
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Erro: UserId é obrigatório!');
  console.log('📖 Uso: node scripts/populate_historical_data.js {userId}');
  console.log('📋 Exemplo: node scripts/populate_historical_data.js wBnoxuKZfUUluhg8jwUtQBB3Jgo2');
  process.exit(1);
}

console.log(`🚀 Iniciando população de dados históricos para userId: ${userId}`);

// Configuração de dados
const EMAILS_DATA = [
  { name: "Newsletter Semanal", subject: "Novidades da Semana - Maio 2025", fromName: "Marketing Team", fromEmail: "newsletter@empresa.com" },
  { name: "Promoção Flash", subject: "⚡ 50% OFF - Apenas Hoje!", fromName: "Ofertas Especiais", fromEmail: "promocoes@empresa.com" },
  { name: "Boas-vindas", subject: "Bem-vindo(a) à nossa plataforma!", fromName: "Equipe de Sucesso", fromEmail: "sucesso@empresa.com" },
  { name: "Recuperação de Carrinho", subject: "Você esqueceu alguns itens...", fromName: "E-commerce", fromEmail: "carrinho@empresa.com" },
  { name: "Evento Webinar", subject: "Convite: Webinar Gratuito - Estratégias 2025", fromName: "Eventos", fromEmail: "eventos@empresa.com" },
  { name: "Pesquisa Satisfação", subject: "Como foi sua experiência conosco?", fromName: "Feedback", fromEmail: "pesquisa@empresa.com" },
  { name: "Produto Novo", subject: "🎉 Lançamento: Nova funcionalidade disponível", fromName: "Produto", fromEmail: "produto@empresa.com" },
  { name: "Newsletter Mensal", subject: "Resumo do Mês - Maio 2025", fromName: "Conteúdo", fromEmail: "conteudo@empresa.com" }
];

const CONTACTS = [
  "joao.silva@email.com", "maria.santos@gmail.com", "pedro.oliveira@hotmail.com",
  "ana.costa@yahoo.com", "carlos.lima@outlook.com", "lucia.ferreira@email.com",
  "marcos.rodrigues@gmail.com", "patricia.alves@hotmail.com", "ricardo.moura@yahoo.com",
  "fernanda.gomes@outlook.com", "rodrigo.barbosa@email.com", "camila.rocha@gmail.com",
  "guilherme.cardoso@hotmail.com", "juliana.martins@yahoo.com", "bruno.nascimento@outlook.com",
  "aline.ribeiro@email.com", "thiago.carvalho@gmail.com", "larissa.pereira@hotmail.com",
  "diego.araujo@yahoo.com", "renata.sousa@outlook.com", "leonardo.dias@email.com",
  "gabriela.castro@gmail.com", "rafael.monteiro@hotmail.com", "bianca.ramos@yahoo.com",
  "vinicius.teixeira@outlook.com", "isabela.lopes@email.com", "caio.mendes@gmail.com",
  "amanda.vieira@hotmail.com", "felipe.borges@yahoo.com", "natalia.freitas@outlook.com"
];

// Função para gerar data aleatória dentro de um dia
function getRandomDateInDay(date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

// Função para gerar distribuição realista de eventos
function generateRealisticMetrics(sentCount) {
  // Taxas realistas do mercado
  const openRate = 0.18 + Math.random() * 0.12; // 18-30%
  const clickRate = 0.02 + Math.random() * 0.04; // 2-6%
  const bounceRate = 0.01 + Math.random() * 0.03; // 1-4%
  const unsubscribeRate = 0.001 + Math.random() * 0.004; // 0.1-0.5%
  
  const openCount = Math.floor(sentCount * openRate);
  const uniqueOpenCount = Math.floor(openCount * (0.7 + Math.random() * 0.3)); // 70-100% de opens únicos
  const clickCount = Math.floor(sentCount * clickRate);
  const uniqueClickCount = Math.floor(clickCount * (0.8 + Math.random() * 0.2)); // 80-100% de clicks únicos
  const bounceCount = Math.floor(sentCount * bounceRate);
  const unsubscribeCount = Math.floor(sentCount * unsubscribeRate);
  
  return {
    openCount,
    uniqueOpenCount,
    clickCount,
    uniqueClickCount,
    bounceCount,
    unsubscribeCount
  };
}

// Função para criar eventos distribuídos ao longo do tempo
async function createEventsForEmail(email, campaign, account, metrics, baseDate) {
  const events = [];
  
  // 1. Criar eventos de SEND
  console.log(`📧 Criando ${email.metrics.sentCount} eventos de envio...`);
  for (let i = 0; i < email.metrics.sentCount; i++) {
    const contact = CONTACTS[i % CONTACTS.length];
    const sendTime = getRandomDateInDay(baseDate);
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'send',
      timestamp: sendTime,
      contactEmail: contact,
      contactId: `contact_${Date.now()}_${i}`,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-contact_${i}-send-${sendTime.getTime()}`,
      metadata: { simulatedData: true }
    });
  }
  
  // 2. Criar eventos de OPEN (baseado nos enviados)
  console.log(`👁️ Criando ${metrics.openCount} eventos de abertura...`);
  const sentEvents = events.filter(e => e.eventType === 'send');
  const shuffledSent = [...sentEvents].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < metrics.openCount; i++) {
    const sendEvent = shuffledSent[i % shuffledSent.length];
    const openTime = new Date(sendEvent.timestamp.getTime() + Math.random() * 86400000); // Até 24h após envio
    
    const isFirstOpen = i < metrics.uniqueOpenCount;
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'open',
      timestamp: openTime,
      contactEmail: sendEvent.contactEmail,
      contactId: sendEvent.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sendEvent.contactId}-open-${openTime.getTime()}`,
      isFirstInteraction: isFirstOpen,
      uniqueIdentifier: `${account._id}-${email._id}-${sendEvent.contactId}-open`,
      metadata: { simulatedData: true, trackingHash: `hash_${Math.random().toString(36).substr(2, 16)}` }
    });
  }
  
  // 3. Criar eventos de CLICK (baseado nos que abriram)
  console.log(`🖱️ Criando ${metrics.clickCount} eventos de clique...`);
  const openEvents = events.filter(e => e.eventType === 'open');
  
  for (let i = 0; i < metrics.clickCount; i++) {
    const openEvent = openEvents[i % openEvents.length];
    const clickTime = new Date(openEvent.timestamp.getTime() + Math.random() * 3600000); // Até 1h após abertura
    
    const isFirstClick = i < metrics.uniqueClickCount;
    const urls = [
      'https://empresa.com/produto1',
      'https://empresa.com/promocao',
      'https://empresa.com/blog/artigo',
      'https://empresa.com/contato',
      'https://empresa.com/cadastro'
    ];
    const clickUrl = urls[i % urls.length];
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'click',
      timestamp: clickTime,
      contactEmail: openEvent.contactEmail,
      contactId: openEvent.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${openEvent.contactId}-click-${clickTime.getTime()}`,
      url: clickUrl,
      isFirstInteraction: isFirstClick,
      uniqueIdentifier: `${account._id}-${email._id}-${openEvent.contactId}-click-${encodeURIComponent(clickUrl)}`,
      metadata: { simulatedData: true, trackingHash: `hash_${Math.random().toString(36).substr(2, 16)}` }
    });
  }
  
  // 4. Criar eventos de BOUNCE
  console.log(`⚠️ Criando ${metrics.bounceCount} eventos de bounce...`);
  for (let i = 0; i < metrics.bounceCount; i++) {
    const sendEvent = shuffledSent[i % shuffledSent.length];
    const bounceTime = new Date(sendEvent.timestamp.getTime() + Math.random() * 3600000); // Até 1h após envio
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'bounce',
      timestamp: bounceTime,
      contactEmail: sendEvent.contactEmail,
      contactId: sendEvent.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sendEvent.contactId}-bounce-${bounceTime.getTime()}`,
      bounceType: Math.random() > 0.7 ? 'hard' : 'soft',
      bounceReason: 'Simulated bounce for historical data',
      isFirstInteraction: true,
      uniqueIdentifier: `${account._id}-${email._id}-${sendEvent.contactId}-bounce`,
      metadata: { simulatedData: true, bounceType: Math.random() > 0.7 ? 'hard' : 'soft' }
    });
  }
  
  // 5. Criar eventos de UNSUBSCRIBE
  console.log(`❌ Criando ${metrics.unsubscribeCount} eventos de unsubscribe...`);
  for (let i = 0; i < metrics.unsubscribeCount; i++) {
    const sendEvent = shuffledSent[i % shuffledSent.length];
    const unsubTime = new Date(sendEvent.timestamp.getTime() + Math.random() * 86400000); // Até 24h após envio
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'unsubscribe',
      timestamp: unsubTime,
      contactEmail: sendEvent.contactEmail,
      contactId: sendEvent.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sendEvent.contactId}-unsubscribe-${unsubTime.getTime()}`,
      isFirstInteraction: true,
      uniqueIdentifier: `${account._id}-${email._id}-${sendEvent.contactId}-unsubscribe`,
      metadata: { simulatedData: true, comments: 'User requested unsubscribe' }
    });
  }
  
  return events;
}

async function populateHistoricalData() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/metricsmail');
    console.log('✅ Conectado ao MongoDB');
    
    // 1. Verificar se já existe conta para este usuário
    let account = await Account.findOne({ userId: userId });
    
    if (!account) {
      // Criar conta
      account = await Account.create({
        userId: userId,
        name: 'Conta Histórica Mautic',
        provider: 'mautic',
        status: 'active',
        apiKey: `historical_key_${Date.now()}`,
        apiSecret: `historical_secret_${Date.now()}`,
        webhookUrl: `https://api.empresa.com/webhooks/${Date.now()}`,
        lastSync: new Date(),
        metadata: { createdBy: 'historical_script' }
      });
      console.log(`✅ Conta criada: ${account.name}`);
    } else {
      console.log(`✅ Usando conta existente: ${account.name}`);
    }
    
    // 2. Criar campanhas
    const campaigns = [];
    const campaignNames = [
      'Campanha Newsletter Maio',
      'Campanha Promocional',
      'Campanha Onboarding',
      'Campanha Reativação'
    ];
    
    for (const campaignName of campaignNames) {
      let campaign = await Campaign.findOne({ 
        userId: userId, 
        account: account._id, 
        name: campaignName 
      });
      
      if (!campaign) {
        campaign = await Campaign.create({
          userId: userId,
          account: account._id,
          name: campaignName,
          externalId: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: 'mautic',
          status: 'sent',
          metadata: { createdBy: 'historical_script' }
        });
      }
      campaigns.push(campaign);
    }
    console.log(`✅ ${campaigns.length} campanhas preparadas`);
    
    // 3. Criar emails e eventos para cada dia (19/05 a 22/05)
    const dates = [
      new Date('2025-05-19'),
      new Date('2025-05-20'),
      new Date('2025-05-21'),
      new Date('2025-05-22')
    ];
    
    let totalEvents = 0;
    
    for (const [dayIndex, date] of dates.entries()) {
      console.log(`\n📅 Processando dia: ${date.toISOString().split('T')[0]}`);
      
      // Determinar quantos emails criar para este dia (1-3 emails por dia)
      const emailsForDay = dayIndex === 3 ? 1 : Math.floor(Math.random() * 2) + 1; // Último dia só 1 email
      
      for (let emailIndex = 0; emailIndex < emailsForDay; emailIndex++) {
        const emailData = EMAILS_DATA[Math.floor(Math.random() * EMAILS_DATA.length)];
        const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
        
        // Determinar volume de envios baseado no dia
        let baseSentCount;
        if (dayIndex === 0) baseSentCount = 150 + Math.floor(Math.random() * 100); // 19/05: 150-250
        else if (dayIndex === 1) baseSentCount = 200 + Math.floor(Math.random() * 150); // 20/05: 200-350
        else if (dayIndex === 2) baseSentCount = 100 + Math.floor(Math.random() * 100); // 21/05: 100-200
        else baseSentCount = 80 + Math.floor(Math.random() * 70); // 22/05: 80-150
        
        const metrics = generateRealisticMetrics(baseSentCount);
        
        // Criar email
        const emailName = `${emailData.name} - ${date.toISOString().split('T')[0]}`;
        let email = await Email.findOne({
          userId: userId,
          account: account._id,
          name: emailName
        });
        
        if (!email) {
          email = await Email.create({
            userId: userId,
            account: account._id,
            campaign: campaign._id,
            name: emailName,
            subject: emailData.subject,
            fromName: emailData.fromName,
            fromEmail: emailData.fromEmail,
            htmlContent: `<html><body><h1>${emailData.subject}</h1><p>Este é um email histórico gerado automaticamente para ${date.toISOString().split('T')[0]}.</p></body></html>`,
            externalId: `historical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            provider: 'mautic',
            metrics: {
              sentCount: baseSentCount,
              openCount: metrics.openCount,
              uniqueOpenCount: metrics.uniqueOpenCount,
              clickCount: metrics.clickCount,
              uniqueClickCount: metrics.uniqueClickCount,
              bounceCount: metrics.bounceCount,
              unsubscribeCount: metrics.unsubscribeCount
            },
            metadata: { createdBy: 'historical_script', originalDate: date }
          });
          
          console.log(`✅ Email criado: ${emailName}`);
          console.log(`   📊 Métricas: ${baseSentCount} enviados, ${metrics.openCount} aberturas, ${metrics.clickCount} cliques`);
        }
        
        // Criar eventos para este email
        const events = await createEventsForEmail(email, campaign, account, metrics, date);
        
        // Inserir eventos em lotes para performance
        const batchSize = 100;
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, i + batchSize);
          await Event.insertMany(batch);
        }
        
        totalEvents += events.length;
        console.log(`✅ ${events.length} eventos criados para ${emailName}`);
        
        // Atualizar métricas das campanhas
        await Campaign.findByIdAndUpdate(campaign._id, {
          $inc: {
            'metrics.sentCount': baseSentCount,
            'metrics.openCount': metrics.openCount,
            'metrics.uniqueOpenCount': metrics.uniqueOpenCount,
            'metrics.clickCount': metrics.clickCount,
            'metrics.uniqueClickCount': metrics.uniqueClickCount,
            'metrics.bounceCount': metrics.bounceCount,
            'metrics.unsubscribeCount': metrics.unsubscribeCount
          }
        });
      }
    }
    
    console.log(`\n🎉 DADOS HISTÓRICOS CRIADOS COM SUCESSO!`);
    console.log(`👤 UserId: ${userId}`);
    console.log(`📧 Total de eventos criados: ${totalEvents}`);
    console.log(`📅 Período: 19/05/2025 a 22/05/2025`);
    console.log(`🏢 Conta: ${account.name}`);
    console.log(`📊 Campanhas: ${campaigns.length}`);
    
    // Relatório final
    const totalEmails = await Email.countDocuments({ userId: userId });
    const totalEventsCreated = await Event.countDocuments({ userId: userId });
    
    console.log(`\n📈 RELATÓRIO FINAL:`);
    console.log(`   Total de emails: ${totalEmails}`);
    console.log(`   Total de eventos: ${totalEventsCreated}`);
    console.log(`   Período coberto: 4 dias`);
    console.log(`   Média de eventos por dia: ${Math.round(totalEventsCreated / 4)}`);
    
  } catch (error) {
    console.error('❌ Erro ao popular dados históricos:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Executar o script
populateHistoricalData();
