const mongoose = require('mongoose');
const Account = require('../src/models/accountModel');
const Campaign = require('../src/models/campaignModel');
const Email = require('../src/models/emailModel');
const Event = require('../src/models/eventModel');

// Argumentos do script
const userId = process.argv[2];
const daysToGenerate = parseInt(process.argv[3]) || 7; // Padrão: últimos 7 dias
const endDate = process.argv[4] ? new Date(process.argv[4]) : new Date(); // Padrão: hoje

if (!userId) {
  console.error('❌ Erro: UserId é obrigatório!');
  console.log('📖 Uso: node scripts/populate_historical_data.js {userId} [dias] [data-fim]');
  console.log('📋 Exemplos:');
  console.log('   node scripts/populate_historical_data.js user123                    # Últimos 7 dias até hoje');
  console.log('   node scripts/populate_historical_data.js user123 30                # Últimos 30 dias até hoje');
  console.log('   node scripts/populate_historical_data.js user123 15 2025-06-01     # 15 dias antes de 01/06/2025');
  process.exit(1);
}

// Calcular período
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - daysToGenerate + 1);

console.log(`🚀 Iniciando população de dados históricos`);
console.log(`👤 UserId: ${userId}`);
console.log(`📅 Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`);
console.log(`📊 Dias a gerar: ${daysToGenerate}`);

// Configuração de dados
const EMAILS_DATA = [
  { name: "Newsletter Semanal", subject: "Novidades da Semana", fromName: "Marketing Team", fromEmail: "newsletter@empresa.com" },
  { name: "Promoção Flash", subject: "⚡ 50% OFF - Apenas Hoje!", fromName: "Ofertas Especiais", fromEmail: "promocoes@empresa.com" },
  { name: "Boas-vindas", subject: "Bem-vindo(a) à nossa plataforma!", fromName: "Equipe de Sucesso", fromEmail: "sucesso@empresa.com" },
  { name: "Recuperação de Carrinho", subject: "Você esqueceu alguns itens...", fromName: "E-commerce", fromEmail: "carrinho@empresa.com" },
  { name: "Evento Webinar", subject: "Convite: Webinar Gratuito - Estratégias de Marketing", fromName: "Eventos", fromEmail: "eventos@empresa.com" },
  { name: "Pesquisa Satisfação", subject: "Como foi sua experiência conosco?", fromName: "Feedback", fromEmail: "pesquisa@empresa.com" },
  { name: "Produto Novo", subject: "🎉 Lançamento: Nova funcionalidade disponível", fromName: "Produto", fromEmail: "produto@empresa.com" },
  { name: "Newsletter Mensal", subject: "Resumo do Mês", fromName: "Conteúdo", fromEmail: "conteudo@empresa.com" },
  { name: "Black Friday", subject: "🔥 Black Friday Antecipada!", fromName: "Vendas", fromEmail: "vendas@empresa.com" },
  { name: "Dicas e Tutoriais", subject: "📚 5 Dicas para Melhorar seus Resultados", fromName: "Educação", fromEmail: "educacao@empresa.com" }
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
  "amanda.vieira@hotmail.com", "felipe.borges@yahoo.com", "natalia.freitas@outlook.com",
  "roberto.silva@email.com", "sandra.oliveira@gmail.com", "eduardo.santos@hotmail.com",
  "cristina.lima@yahoo.com", "paulo.costa@outlook.com", "daniela.ferreira@email.com",
  "andre.rodrigues@gmail.com", "monica.alves@hotmail.com", "fernando.moura@yahoo.com",
  "juliana.gomes@outlook.com", "lucas.barbosa@email.com", "beatriz.rocha@gmail.com"
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
  // Taxas realistas do mercado brasileiro
  const openRate = 0.15 + Math.random() * 0.20; // 15-35%
  const clickRate = 0.02 + Math.random() * 0.06; // 2-8%
  const bounceRate = 0.01 + Math.random() * 0.04; // 1-5%
  const unsubscribeRate = 0.001 + Math.random() * 0.003; // 0.1-0.4%
  
  const openCount = Math.floor(sentCount * openRate);
  const uniqueOpenCount = Math.floor(openCount * (0.65 + Math.random() * 0.35)); // 65-100% de opens únicos
  const clickCount = Math.floor(sentCount * clickRate);
  const uniqueClickCount = Math.floor(clickCount * (0.75 + Math.random() * 0.25)); // 75-100% de clicks únicos
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
  const sentContacts = [];
  for (let i = 0; i < email.metrics.sentCount; i++) {
    const contact = CONTACTS[i % CONTACTS.length];
    const sendTime = getRandomDateInDay(baseDate);
    
    sentContacts.push({ contact, sendTime, contactId: `contact_${Date.now()}_${i}` });
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'send',
      timestamp: sendTime,
      contactEmail: contact,
      contactId: sentContacts[i].contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sentContacts[i].contactId}-send-${sendTime.getTime()}`,
      metadata: { simulatedData: true }
    });
  }
  
  // 2. Criar eventos de OPEN
  const shuffledSent = [...sentContacts].sort(() => Math.random() - 0.5);
  const openedContacts = shuffledSent.slice(0, metrics.openCount);
  
  for (let i = 0; i < metrics.openCount; i++) {
    const sendInfo = openedContacts[i % openedContacts.length];
    const openTime = new Date(sendInfo.sendTime.getTime() + Math.random() * 48 * 3600000); // Até 48h após envio
    
    const isFirstOpen = i < metrics.uniqueOpenCount;
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'open',
      timestamp: openTime,
      contactEmail: sendInfo.contact,
      contactId: sendInfo.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sendInfo.contactId}-open-${openTime.getTime()}`,
      isFirstInteraction: isFirstOpen,
      uniqueIdentifier: `${account._id}-${email._id}-${sendInfo.contactId}-open`,
      metadata: { simulatedData: true, trackingHash: `hash_${Math.random().toString(36).substr(2, 16)}` }
    });
  }
  
  // 3. Criar eventos de CLICK
  const clickedContacts = openedContacts.slice(0, Math.floor(openedContacts.length * 0.3)); // 30% dos que abriram clicam
  
  for (let i = 0; i < metrics.clickCount; i++) {
    const sendInfo = clickedContacts[i % clickedContacts.length];
    const clickTime = new Date(sendInfo.sendTime.getTime() + Math.random() * 72 * 3600000); // Até 72h após envio
    
    const isFirstClick = i < metrics.uniqueClickCount;
    const urls = [
      'https://empresa.com/produto1',
      'https://empresa.com/promocao',
      'https://empresa.com/blog/artigo',
      'https://empresa.com/contato',
      'https://empresa.com/cadastro',
      'https://empresa.com/download',
      'https://empresa.com/webinar',
      'https://empresa.com/ebook'
    ];
    const clickUrl = urls[Math.floor(Math.random() * urls.length)];
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'click',
      timestamp: clickTime,
      contactEmail: sendInfo.contact,
      contactId: sendInfo.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sendInfo.contactId}-click-${clickTime.getTime()}`,
      url: clickUrl,
      isFirstInteraction: isFirstClick,
      uniqueIdentifier: `${account._id}-${email._id}-${sendInfo.contactId}-click-${encodeURIComponent(clickUrl)}`,
      metadata: { simulatedData: true, trackingHash: `hash_${Math.random().toString(36).substr(2, 16)}` }
    });
  }
  
  // 4. Criar eventos de BOUNCE
  const bouncedContacts = shuffledSent.slice(-metrics.bounceCount); // Últimos da lista
  
  for (let i = 0; i < metrics.bounceCount; i++) {
    const sendInfo = bouncedContacts[i % bouncedContacts.length];
    const bounceTime = new Date(sendInfo.sendTime.getTime() + Math.random() * 3600000); // Até 1h após envio
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'bounce',
      timestamp: bounceTime,
      contactEmail: sendInfo.contact,
      contactId: sendInfo.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sendInfo.contactId}-bounce-${bounceTime.getTime()}`,
      bounceType: Math.random() > 0.7 ? 'hard' : 'soft',
      bounceReason: 'Simulated bounce for test data',
      isFirstInteraction: true,
      uniqueIdentifier: `${account._id}-${email._id}-${sendInfo.contactId}-bounce`,
      metadata: { simulatedData: true, bounceType: Math.random() > 0.7 ? 'hard' : 'soft' }
    });
  }
  
  // 5. Criar eventos de UNSUBSCRIBE
  for (let i = 0; i < metrics.unsubscribeCount; i++) {
    const sendInfo = shuffledSent[i % shuffledSent.length];
    const unsubTime = new Date(sendInfo.sendTime.getTime() + Math.random() * 7 * 24 * 3600000); // Até 7 dias após envio
    
    events.push({
      userId: userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'unsubscribe',
      timestamp: unsubTime,
      contactEmail: sendInfo.contact,
      contactId: sendInfo.contactId,
      provider: 'mautic',
      externalId: `${account._id}-${email._id}-${sendInfo.contactId}-unsubscribe-${unsubTime.getTime()}`,
      isFirstInteraction: true,
      uniqueIdentifier: `${account._id}-${email._id}-${sendInfo.contactId}-unsubscribe`,
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
        name: 'Mautic - Conta Principal',
        provider: 'mautic',
        status: 'active',
        apiKey: `mautic_key_${Date.now()}`,
        apiSecret: `mautic_secret_${Date.now()}`,
        webhookUrl: `https://api.empresa.com/webhooks/mautic/${Date.now()}`,
        lastSync: new Date(),
        metadata: { 
          createdBy: 'populate_script',
          version: '2.0',
          environment: 'test'
        }
      });
      console.log(`✅ Conta criada: ${account.name}`);
    } else {
      console.log(`✅ Usando conta existente: ${account.name}`);
    }
    
    // 2. Criar campanhas
    const campaigns = [];
    const campaignNames = [
      'Newsletter Semanal',
      'Campanha Promocional',
      'Onboarding Novos Usuários',
      'Reengajamento',
      'Lançamento de Produto',
      'Black Friday'
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
          metadata: { 
            createdBy: 'populate_script',
            type: campaignName.toLowerCase().replace(/\s+/g, '_')
          }
        });
      }
      campaigns.push(campaign);
    }
    console.log(`✅ ${campaigns.length} campanhas preparadas`);
    
    // 3. Criar emails e eventos para cada dia
    const dates = [];
    const currentDate = new Date(startDate);
    
    // Gerar array de datas
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    let totalEvents = 0;
    let totalEmailsSent = 0;
    
    for (const [dayIndex, date] of dates.entries()) {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      console.log(`\n📅 Processando ${dateStr} (${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek]})`);
      
      // Ajustar volume baseado no dia da semana
      let volumeMultiplier = 1;
      if (dayOfWeek === 0 || dayOfWeek === 6) volumeMultiplier = 0.3; // Fim de semana: 30%
      else if (dayOfWeek === 2 || dayOfWeek === 3) volumeMultiplier = 1.2; // Ter/Qua: 120%
      
      // Determinar quantos emails criar para este dia (1-4 emails por dia)
      const emailsForDay = Math.max(1, Math.floor((Math.random() * 3 + 1) * volumeMultiplier));
      
      for (let emailIndex = 0; emailIndex < emailsForDay; emailIndex++) {
        const emailData = EMAILS_DATA[Math.floor(Math.random() * EMAILS_DATA.length)];
        const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
        
        // Volume base variando por dia
        const baseVolume = 200 + Math.floor(Math.random() * 300); // 200-500
        const baseSentCount = Math.floor(baseVolume * volumeMultiplier);
        
        const metrics = generateRealisticMetrics(baseSentCount);
        
        // Criar email
        const emailName = `${emailData.name} - ${dateStr}`;
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
            subject: `${emailData.subject} - ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`,
            fromName: emailData.fromName,
            fromEmail: emailData.fromEmail,
            htmlContent: `<html><body><h1>${emailData.subject}</h1><p>Email enviado em ${date.toLocaleDateString('pt-BR')}</p></body></html>`,
            externalId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            provider: 'mautic',
            sentDate: date,
            metrics: {
              sentCount: baseSentCount,
              openCount: metrics.openCount,
              uniqueOpenCount: metrics.uniqueOpenCount,
              clickCount: metrics.clickCount,
              uniqueClickCount: metrics.uniqueClickCount,
              bounceCount: metrics.bounceCount,
              unsubscribeCount: metrics.unsubscribeCount,
              deliveredCount: baseSentCount - metrics.bounceCount
            },
            metadata: { 
              createdBy: 'populate_script',
              originalDate: date,
              dayOfWeek: dayOfWeek,
              volumeMultiplier: volumeMultiplier
            }
          });
          
          console.log(`✅ Email criado: ${emailName}`);
          console.log(`   📊 Métricas: ${baseSentCount} enviados, ${metrics.openCount} aberturas (${(metrics.openCount/baseSentCount*100).toFixed(1)}%), ${metrics.clickCount} cliques (${(metrics.clickCount/baseSentCount*100).toFixed(1)}%)`);
          
          totalEmailsSent += baseSentCount;
        }
        
        // Criar eventos para este email
        const events = await createEventsForEmail(email, campaign, account, metrics, date);
        
        // Inserir eventos em lotes para performance
        const batchSize = 500;
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, i + batchSize);
          await Event.insertMany(batch, { ordered: false });
        }
        
        totalEvents += events.length;
        console.log(`   ✅ ${events.length} eventos criados`);
        
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
    console.log(`📊 RESUMO FINAL:`);
    console.log(`   👤 UserId: ${userId}`);
    console.log(`   📅 Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]} (${daysToGenerate} dias)`);
    console.log(`   🏢 Conta: ${account.name}`);
    console.log(`   📧 Total de emails enviados: ${totalEmailsSent.toLocaleString()}`);
    console.log(`   🎯 Total de eventos criados: ${totalEvents.toLocaleString()}`);
    console.log(`   📊 Média diária: ${Math.round(totalEmailsSent / daysToGenerate).toLocaleString()} emails/dia`);
    
    // Estatísticas finais
    const totalEmails = await Email.countDocuments({ userId: userId });
    const totalEventsCreated = await Event.countDocuments({ userId: userId });
    
    console.log(`\n📈 BANCO DE DADOS:`);
    console.log(`   Total de emails no banco: ${totalEmails}`);
    console.log(`   Total de eventos no banco: ${totalEventsCreated}`);
    
  } catch (error) {
    console.error('❌ Erro ao popular dados históricos:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Executar o script
populateHistoricalData();
