// Script para popular dados de teste para o usuário "test-user"
// Execução: node teste-user-dados-fix.js

require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { Account, Campaign, Email, Event, Metrics } = require('./src/models');

// Função auxiliar para criar datas com horário específico
const createDate = (year, month, day, hour = 0, minute = 0, second = 0) => {
    return new Date(year, month - 1, day, hour, minute, second);
};

// Função para gerar um número aleatório dentro de um intervalo
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

// Função para gerar emails aleatórios únicos
const generateUniqueEmail = (index) => {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'empresa.com.br'];
    const firstNames = ['joao', 'maria', 'pedro', 'ana', 'carlos', 'patricia', 'felipe', 'camila', 'lucas', 'amanda'];
    const lastNames = ['silva', 'santos', 'oliveira', 'souza', 'costa', 'pereira', 'ferreira', 'rodrigues', 'almeida', 'nascimento'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${firstName}.${lastName}${index}@${domain}`;
};

// Configurações para a geração de dados
const TEST_USER_ID = 'test-user';
const START_DATE = createDate(2025, 5, 1); // 01/05/2025
const END_DATE = createDate(2025, 5, 7);   // 07/05/2025
const EMAIL_RECIPIENTS_BASE = 5000;        // Base para cálculo de destinatários

// Conectar ao MongoDB
async function connectToDatabase() {
    try {
        console.log('Conectando ao MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado ao MongoDB com sucesso!');
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
}

// Limpar dados existentes para o test-user
async function clearExistingData() {
    console.log(`Removendo dados existentes para o usuário ${TEST_USER_ID}...`);
    await Account.deleteMany({ userId: TEST_USER_ID });
    await Campaign.deleteMany({ userId: TEST_USER_ID });
    await Email.deleteMany({ userId: TEST_USER_ID });
    await Event.deleteMany({ userId: TEST_USER_ID });
    await Metrics.deleteMany({ userId: TEST_USER_ID });
    console.log('Dados existentes removidos.');
}

// Criar contas para o test-user
async function createAccounts() {
    console.log('Criando contas...');
    
    const accounts = [
        {
            userId: TEST_USER_ID,
            name: "Marketing Principal",
            provider: "mautic",
            url: "https://mautic.empresa.com",
            credentials: {
                username: "admin",
                password: "senha123",
                apiKey: "mautic_api_key_123"
            },
            status: "active",
            lastSync: new Date(),
            isConnected: true,
            webhookId: "webhook_mautic_123",
            webhookSecret: "webhook_secret_123",
            settings: {
                defaultSender: "marketing@empresa.com",
                timezone: "America/Sao_Paulo"
            }
        },
        {
            userId: TEST_USER_ID,
            name: "Emails de Produto",
            provider: "klaviyo",
            url: "https://klaviyo.empresa.com",
            credentials: {
                username: "product_manager",
                password: "senha456",
                apiKey: "klaviyo_api_key_456"
            },
            status: "active",
            lastSync: new Date(),
            isConnected: true,
            settings: { 
                defaultSender: "produtos@empresa.com" 
            }
        },
        {
            userId: TEST_USER_ID,
            name: "Newsletter Mensal",
            provider: "activecampaign",
            url: "https://activecampaign.empresa.com",
            credentials: {
                username: "newsletter_admin",
                password: "senha789",
                apiKey: "activecampaign_api_key_789"
            },
            status: "active",
            lastSync: new Date(),
            isConnected: true,
            settings: { 
                defaultSender: "newsletter@empresa.com" 
            }
        }
    ];
    
    const createdAccounts = await Account.insertMany(accounts);
    console.log(`${createdAccounts.length} contas criadas.`);
    return createdAccounts;
}

// Criar campanhas
async function createCampaigns(accounts) {
    console.log('Criando campanhas...');
    
    const campaignData = [
        // Campanhas da conta Mautic (Marketing Principal)
        {
            account: accounts[0]._id,
            provider: accounts[0].provider,
            name: "Lançamento Novo Produto - Maio 2025",
            description: "Campanha de lançamento da nova linha de produtos",
            scheduledDate: createDate(2025, 5, 1, 8, 0, 0),
            sentDate: createDate(2025, 5, 1, 8, 0, 0),
            status: "sent",
            tags: ["lancamento", "produto", "maio2025"]
        },
        {
            account: accounts[0]._id,
            provider: accounts[0].provider,
            name: "Promoção Fim de Semana",
            description: "Promoção especial de fim de semana com descontos exclusivos",
            scheduledDate: createDate(2025, 5, 3, 9, 0, 0),
            sentDate: createDate(2025, 5, 3, 9, 0, 0),
            status: "sent",
            tags: ["promocao", "desconto", "fimdesemana"]
        },
        {
            account: accounts[0]._id,
            provider: accounts[0].provider,
            name: "Dicas de Uso do Produto",
            description: "Email com dicas de uso para melhorar a experiência do cliente",
            scheduledDate: createDate(2025, 5, 5, 10, 0, 0),
            sentDate: createDate(2025, 5, 5, 10, 0, 0),
            status: "sent",
            tags: ["dicas", "produto", "experiencia"]
        },
        
        // Campanhas da conta Klaviyo (Emails de Produto)
        {
            account: accounts[1]._id,
            provider: accounts[1].provider,
            name: "Atualização de Produto - Versão 2.5",
            description: "Informações sobre a última atualização do produto versão 2.5",
            scheduledDate: createDate(2025, 5, 2, 11, 0, 0),
            sentDate: createDate(2025, 5, 2, 11, 0, 0),
            status: "sent",
            tags: ["atualizacao", "produto", "versao"]
        },
        {
            account: accounts[1]._id,
            provider: accounts[1].provider,
            name: "Feedback de Produto",
            description: "Solicitação de feedback sobre a experiência com o produto",
            scheduledDate: createDate(2025, 5, 4, 12, 0, 0),
            sentDate: createDate(2025, 5, 4, 12, 0, 0),
            status: "sent",
            tags: ["feedback", "pesquisa", "produto"]
        },
        
        // Campanha da conta ActiveCampaign (Newsletter Mensal)
        {
            account: accounts[2]._id,
            provider: accounts[2].provider,
            name: "Newsletter de Maio 2025",
            description: "Newsletter mensal com novidades e conteúdo do mês",
            scheduledDate: createDate(2025, 5, 7, 9, 0, 0),
            sentDate: createDate(2025, 5, 7, 9, 0, 0),
            status: "sent",
            tags: ["newsletter", "mensal", "maio2025"]
        }
    ];
    
    // Criar as campanhas com métricas iniciais
    const campaigns = [];
    
    for (const data of campaignData) {
        // Gerar métricas realistas
        const recipientsCount = randomInt(EMAIL_RECIPIENTS_BASE * 0.8, EMAIL_RECIPIENTS_BASE * 1.2);
        const sentCount = recipientsCount;
        const deliveredCount = Math.floor(sentCount * (randomInt(94, 98) / 100)); // 94-98% de taxa de entrega
        const bounceCount = sentCount - deliveredCount;
        const openCount = Math.floor(deliveredCount * (randomInt(25, 45) / 100)); // 25-45% de taxa de abertura
        const clickCount = Math.floor(openCount * (randomInt(15, 30) / 100)); // 15-30% de taxa de clique
        const unsubscribeCount = Math.floor(deliveredCount * (randomInt(0.1, 0.5) / 100)); // 0.1-0.5% de descadastramento
        const complaintCount = Math.floor(deliveredCount * (randomInt(0.01, 0.1) / 100)); // 0.01-0.1% de reclamações
        
        // Gerar um ID externo verdadeiramente único combinando timestamp, valores aleatórios e índice
        const timestamp = Date.now();
        const randomValue = Math.floor(Math.random() * 1000000);
        const uniqueExternalId = `${data.provider}_campaign_${timestamp}_${randomValue}`;
        
        campaigns.push({
            userId: TEST_USER_ID,
            name: data.name,
            description: data.description,
            account: data.account,
            externalId: uniqueExternalId,
            status: data.status,
            scheduledDate: data.scheduledDate,
            sentDate: data.sentDate,
            metrics: {
                recipientsCount,
                sentCount,
                deliveredCount,
                openCount,
                clickCount,
                bounceCount,
                unsubscribeCount,
                complaintCount
            },
            tags: data.tags
        });
    }
    
    // Inserir campanhas individualmente para maior segurança
    const createdCampaigns = [];
    for (const campaign of campaigns) {
        try {
            const createdCampaign = await Campaign.create(campaign);
            createdCampaigns.push(createdCampaign);
            console.log(`Campanha criada: ${createdCampaign.name}`);
        } catch (error) {
            console.error(`Erro ao criar campanha "${campaign.name}":`, error.message);
        }
    }
    
    console.log(`${createdCampaigns.length} campanhas criadas.`);
    return createdCampaigns;
}

// Criar templates de email para as campanhas
async function createEmails(campaigns, accounts) {
    console.log('Criando templates de email...');
    
    const emails = [];
    
    // Para cada campanha, criar 1-2 templates de email
    for (const campaign of campaigns) {
        // Encontrar a conta correspondente
        const account = accounts.find(a => a._id.toString() === campaign.account.toString());
        
        // Determinar quantos templates criar para esta campanha (1 ou 2)
        const templatesCount = Math.random() > 0.5 ? 2 : 1;
        
        for (let i = 1; i <= templatesCount; i++) {
            // Dividir as métricas da campanha entre os templates
            const divider = templatesCount;
            const metrics = {
                recipientsCount: Math.floor(campaign.metrics.recipientsCount / divider),
                sentCount: Math.floor(campaign.metrics.sentCount / divider),
                deliveredCount: Math.floor(campaign.metrics.deliveredCount / divider),
                openCount: Math.floor(campaign.metrics.openCount / divider),
                uniqueOpenCount: Math.floor(campaign.metrics.openCount * 0.85 / divider), // 85% das aberturas são únicas
                clickCount: Math.floor(campaign.metrics.clickCount / divider),
                uniqueClickCount: Math.floor(campaign.metrics.clickCount * 0.9 / divider), // 90% dos cliques são únicos
                bounceCount: Math.floor(campaign.metrics.bounceCount / divider),
                unsubscribeCount: Math.floor(campaign.metrics.unsubscribeCount / divider),
                complaintCount: Math.floor(campaign.metrics.complaintCount / divider)
            };
            
            // Definir assunto com base no nome da campanha
            let subject = `${campaign.name} - Parte ${i}`;
            if (templatesCount === 1) {
                subject = campaign.name;
            }
            
            // Gerar um ID externo único
            const timestamp = Date.now();
            const randomValue = Math.floor(Math.random() * 1000000);
            const uniqueExternalId = `${account.provider}_email_${timestamp}_${randomValue}_${i}`;
            
            // Criar o template de email
            emails.push({
                userId: TEST_USER_ID,
                account: campaign.account,
                campaign: campaign._id,
                subject: subject,
                fromName: "Empresa Exemplo",
                fromEmail: account.settings.defaultSender || "marketing@empresa.com",
                replyTo: "no-reply@empresa.com",
                textContent: `Conteúdo de texto para o email "${subject}"...`,
                htmlContent: `<h1>${subject}</h1><p>Este é um email de teste para a campanha ${campaign.name}</p><div>Conteúdo HTML completo aqui...</div>`,
                externalId: uniqueExternalId,
                provider: account.provider,
                metrics: metrics
            });
        }
    }
    
    // Inserir emails individualmente para maior segurança
    const createdEmails = [];
    for (const email of emails) {
        try {
            const createdEmail = await Email.create(email);
            createdEmails.push(createdEmail);
        } catch (error) {
            console.error(`Erro ao criar email "${email.subject}":`, error.message);
        }
    }
    
    console.log(`${createdEmails.length} templates de email criados.`);
    return createdEmails;
}

// Criar eventos de email (envios, aberturas, cliques, etc.)
async function createEvents(campaigns, emails) {
    console.log('Criando eventos...');
    
    const events = [];
    let totalEvents = 0;
    
    // Para cada email, criar eventos reais
    for (const email of emails) {
        // Encontrar a campanha associada
        const campaign = campaigns.find(c => c._id.toString() === email.campaign.toString());
        
        // Definir datas importantes
        const sentDate = campaign.sentDate;
        
        // Criar lista de contatos (destinatários)
        const contactsCount = email.metrics.recipientsCount;
        const contacts = [];
        
        for (let i = 0; i < contactsCount; i++) {
            contacts.push({
                email: generateUniqueEmail(totalEvents + i),
                id: `contact_${totalEvents + i}`
            });
        }
        
        console.log(`Gerando ${contactsCount} eventos de envio para o email "${email.subject}"...`);
        
        // Criar eventos para cada contato
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            
            // Gerar IDs externos únicos
            const timestamp = Date.now();
            const randomValue = Math.floor(Math.random() * 1000000);
            
            // 1. Evento de envio (para todos os destinatários)
            const sendTimestamp = new Date(sentDate.getTime() + randomInt(0, 60 * 60 * 1000)); // Até 1 hora após o horário de envio
            
            events.push({
                userId: TEST_USER_ID,
                account: email.account,
                campaign: email.campaign,
                email: email._id,
                eventType: "send",
                timestamp: sendTimestamp,
                contactEmail: contact.email,
                contactId: contact.id,
                provider: email.provider,
                externalId: `event_send_${timestamp}_${randomValue}_${i}`
            });
            totalEvents++;
            
            // 2. Verificar se houve bounce
            const isBounce = i < email.metrics.bounceCount;
            
            if (isBounce) {
                const bounceTimestamp = new Date(sendTimestamp.getTime() + randomInt(1, 30) * 60000); // 1-30 minutos após o envio
                const bounceType = Math.random() > 0.3 ? "hard" : "soft";
                const bounceReason = bounceType === "hard" ? "Invalid recipient" : "Mailbox full";
                
                events.push({
                    userId: TEST_USER_ID,
                    account: email.account,
                    campaign: email.campaign,
                    email: email._id,
                    eventType: "bounce",
                    timestamp: bounceTimestamp,
                    contactEmail: contact.email,
                    contactId: contact.id,
                    provider: email.provider,
                    externalId: `event_bounce_${timestamp}_${randomValue}_${i}`,
                    bounceType: bounceType,
                    bounceReason: bounceReason
                });
                totalEvents++;
                
                // Se houve bounce, não haverá outros eventos para este contato
                continue;
            }
            
            // 3. Evento de entrega (para quem não teve bounce)
            const deliveryTimestamp = new Date(sendTimestamp.getTime() + randomInt(1, 15) * 60000); // 1-15 minutos após o envio
            
            events.push({
                userId: TEST_USER_ID,
                account: email.account,
                campaign: email.campaign,
                email: email._id,
                eventType: "delivery",
                timestamp: deliveryTimestamp,
                contactEmail: contact.email,
                contactId: contact.id,
                provider: email.provider,
                externalId: `event_delivery_${timestamp}_${randomValue}_${i}`
            });
            totalEvents++;
            
            // 4. Verificar se houve abertura
            const deliveredCount = email.metrics.deliveredCount;
            const openCount = email.metrics.openCount;
            const openRate = openCount / deliveredCount;
            
            const isOpened = i < openCount;
            
            if (isOpened) {
                // Calcular quando o email foi aberto (entre a entrega e 3 dias depois)
                const minOpenTime = deliveryTimestamp.getTime() + 30000; // No mínimo 30 segundos após a entrega
                const maxOpenTime = sentDate.getTime() + (3 * 24 * 60 * 60 * 1000); // No máximo 3 dias após o envio
                const openTimestamp = new Date(randomInt(minOpenTime, maxOpenTime));
                
                // Informações do dispositivo
                const devices = ["Mobile", "Desktop", "Tablet"];
                const browsers = ["Chrome", "Safari", "Firefox", "Edge"];
                const oss = ["Windows", "MacOS", "iOS", "Android"];
                
                const device = devices[randomInt(0, devices.length - 1)];
                const browser = browsers[randomInt(0, browsers.length - 1)];
                const os = oss[randomInt(0, oss.length - 1)];
                
                // Criar evento de abertura
                events.push({
                    userId: TEST_USER_ID,
                    account: email.account,
                    campaign: email.campaign,
                    email: email._id,
                    eventType: "open",
                    timestamp: openTimestamp,
                    contactEmail: contact.email,
                    contactId: contact.id,
                    provider: email.provider,
                    externalId: `event_open_${timestamp}_${randomValue}_${i}`,
                    ipAddress: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`,
                    userAgent: `Mozilla/5.0 (${os}) ${browser}/${randomInt(70, 120)}.0`,
                    metadata: {
                        device: device,
                        browser: browser,
                        os: os
                    }
                });
                totalEvents++;
                
                // 5. Verificar se houve clique após a abertura
                const clickCount = email.metrics.clickCount;
                const clickRate = clickCount / openCount;
                
                const isClicked = i < clickCount;
                
                if (isClicked) {
                    // Calcular quando ocorreu o clique (entre a abertura e 1 hora depois)
                    const clickTimestamp = new Date(openTimestamp.getTime() + randomInt(5, 60 * 60) * 1000); // 5 segundos a 1 hora após abrir
                    
                    // URLs possíveis para clique
                    const urls = [
                        "https://empresa.com/produtos",
                        "https://empresa.com/oferta-especial",
                        "https://empresa.com/download",
                        "https://empresa.com/contato"
                    ];
                    
                    const clickedUrl = urls[randomInt(0, urls.length - 1)];
                    
                    // Criar evento de clique
                    events.push({
                        userId: TEST_USER_ID,
                        account: email.account,
                        campaign: email.campaign,
                        email: email._id,
                        eventType: "click",
                        timestamp: clickTimestamp,
                        contactEmail: contact.email,
                        contactId: contact.id,
                        provider: email.provider,
                        externalId: `event_click_${timestamp}_${randomValue}_${i}`,
                        ipAddress: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`,
                        userAgent: `Mozilla/5.0 (${os}) ${browser}/${randomInt(70, 120)}.0`,
                        url: clickedUrl,
                        urlId: `url_${randomInt(1, 10)}`
                    });
                    totalEvents++;
                }
                
                // 6. Verificar se houve unsubscribe
                const unsubscribeCount = email.metrics.unsubscribeCount;
                const unsubRate = unsubscribeCount / deliveredCount;
                
                const isUnsubscribed = i < unsubscribeCount;
                
                if (isUnsubscribed) {
                    // Calcular quando ocorreu o unsubscribe (entre a abertura e 2 dias depois)
                    const unsubTimestamp = new Date(openTimestamp.getTime() + randomInt(60, 48 * 60 * 60) * 1000); // 1 minuto a 2 dias após abrir
                    
                    // Criar evento de unsubscribe
                    events.push({
                        userId: TEST_USER_ID,
                        account: email.account,
                        campaign: email.campaign,
                        email: email._id,
                        eventType: "unsubscribe",
                        timestamp: unsubTimestamp,
                        contactEmail: contact.email,
                        contactId: contact.id,
                        provider: email.provider,
                        externalId: `event_unsub_${timestamp}_${randomValue}_${i}`
                    });
                    totalEvents++;
                }
                
                // 7. Verificar se houve reclamação (muito raro)
                const complaintCount = email.metrics.complaintCount;
                const complaintRate = complaintCount / deliveredCount;
                
                const isComplaint = i < complaintCount;
                
                if (isComplaint) {
                    // Calcular quando ocorreu a reclamação (entre a abertura e 3 dias depois)
                    const complaintTimestamp = new Date(openTimestamp.getTime() + randomInt(3600, 72 * 60 * 60) * 1000); // 1 hora a 3 dias após abrir
                    
                    // Criar evento de reclamação
                    events.push({
                        userId: TEST_USER_ID,
                        account: email.account,
                        campaign: email.campaign,
                        email: email._id,
                        eventType: "complaint",
                        timestamp: complaintTimestamp,
                        contactEmail: contact.email,
                        contactId: contact.id,
                        provider: email.provider,
                        externalId: `event_complaint_${timestamp}_${randomValue}_${i}`
                    });
                    totalEvents++;
                }
            }
            
            // Limitar quantidade de eventos para não sobrecarregar o banco
            if (totalEvents >= 2000) {
                console.log(`Limitando a ${totalEvents} eventos para não sobrecarregar o banco de dados.`);
                break;
            }
        }
        
        // Limitar quantidade de eventos por email
        if (totalEvents >= 2000) {
            break;
        }
    }
    
    // Inserir eventos em lotes para evitar sobrecarga de memória
    const BATCH_SIZE = 100;
    let insertedEvents = 0;
    
    console.log(`Inserindo ${events.length} eventos em lotes de ${BATCH_SIZE}...`);
    
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        try {
            await Event.insertMany(batch);
            insertedEvents += batch.length;
            console.log(`Inseridos ${insertedEvents}/${events.length} eventos.`);
        } catch (error) {
            console.error(`Erro ao inserir lote de eventos:`, error.message);
        }
    }
    
    console.log(`${insertedEvents} eventos criados.`);
    return events;
}

// Criar métricas agregadas
async function createMetrics(campaigns, emails) {
    console.log('Gerando métricas agregadas...');
    
    const metrics = [];
    
    // 1. Métricas diárias para cada conta
    for (const campaign of campaigns) {
        // Determinar data do evento
        const eventDate = new Date(campaign.sentDate);
        
        // Métricas por dia, por conta, por campanha
        metrics.push({
            userId: TEST_USER_ID,
            account: campaign.account,
            campaign: campaign._id,
            date: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 0, 0, 0),
            period: "day",
            metrics: {
                totalEvents: campaign.metrics.sentCount + campaign.metrics.deliveredCount + 
                             campaign.metrics.openCount + campaign.metrics.clickCount + 
                             campaign.metrics.bounceCount + campaign.metrics.unsubscribeCount + 
                             campaign.metrics.complaintCount,
                sentCount: campaign.metrics.sentCount,
                deliveredCount: campaign.metrics.deliveredCount,
                openCount: campaign.metrics.openCount,
                uniqueOpenCount: Math.floor(campaign.metrics.openCount * 0.85),
                clickCount: campaign.metrics.clickCount,
                uniqueClickCount: Math.floor(campaign.metrics.clickCount * 0.9),
                bounceCount: campaign.metrics.bounceCount,
                unsubscribeCount: campaign.metrics.unsubscribeCount,
                complaintCount: campaign.metrics.complaintCount,
                
                // Cálculo de taxas
                deliveryRate: campaign.metrics.sentCount > 0 ? 
                              (campaign.metrics.deliveredCount / campaign.metrics.sentCount) * 100 : 0,
                openRate: campaign.metrics.deliveredCount > 0 ? 
                         (campaign.metrics.openCount / campaign.metrics.deliveredCount) * 100 : 0,
                clickRate: campaign.metrics.deliveredCount > 0 ? 
                          (campaign.metrics.clickCount / campaign.metrics.deliveredCount) * 100 : 0,
                clickToOpenRate: campaign.metrics.openCount > 0 ? 
                                (campaign.metrics.clickCount / campaign.metrics.openCount) * 100 : 0,
                bounceRate: campaign.metrics.sentCount > 0 ? 
                           (campaign.metrics.bounceCount / campaign.metrics.sentCount) * 100 : 0,
                unsubscribeRate: campaign.metrics.deliveredCount > 0 ? 
                                (campaign.metrics.unsubscribeCount / campaign.metrics.deliveredCount) * 100 : 0,
                complaintRate: campaign.metrics.deliveredCount > 0 ? 
                              (campaign.metrics.complaintCount / campaign.metrics.deliveredCount) * 100 : 0
            }
        });
    }
    
    // 2. Métricas diárias por conta (sem campanha específica)
    const dates = [];
    for (let d = new Date(START_DATE); d <= END_DATE; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
    }
    
    // Agrupar campanhas por conta e data
    const campaignsByAccountAndDate = {};
    
    for (const campaign of campaigns) {
        const accountId = campaign.account.toString();
        const date = new Date(campaign.sentDate.getFullYear(), campaign.sentDate.getMonth(), campaign.sentDate.getDate()).toISOString();
        
        if (!campaignsByAccountAndDate[accountId]) {
            campaignsByAccountAndDate[accountId] = {};
        }
        
        if (!campaignsByAccountAndDate[accountId][date]) {
            campaignsByAccountAndDate[accountId][date] = [];
        }
        
        campaignsByAccountAndDate[accountId][date].push(campaign);
    }
    
    // Gerar métricas agregadas por conta por dia
    for (const accountId in campaignsByAccountAndDate) {
        for (const dateStr in campaignsByAccountAndDate[accountId]) {
            const date = new Date(dateStr);
            const accountCampaigns = campaignsByAccountAndDate[accountId][dateStr];
            
            // Somar as métricas de todas as campanhas desta conta neste dia
            const totalMetrics = {
                sentCount: 0,
                deliveredCount: 0,
                openCount: 0,
                uniqueOpenCount: 0,
                clickCount: 0,
                uniqueClickCount: 0,
                bounceCount: 0,
                unsubscribeCount: 0,
                complaintCount: 0
            };
            
            accountCampaigns.forEach(campaign => {
                totalMetrics.sentCount += campaign.metrics.sentCount;
                totalMetrics.deliveredCount += campaign.metrics.deliveredCount;
                totalMetrics.openCount += campaign.metrics.openCount;
                totalMetrics.uniqueOpenCount += Math.floor(campaign.metrics.openCount * 0.85);
                totalMetrics.clickCount += campaign.metrics.clickCount;
                totalMetrics.uniqueClickCount += Math.floor(campaign.metrics.clickCount * 0.9);
                totalMetrics.bounceCount += campaign.metrics.bounceCount;
                totalMetrics.unsubscribeCount += campaign.metrics.unsubscribeCount;
                totalMetrics.complaintCount += campaign.metrics.complaintCount;
            });
            
            // Calcular métricas agregadas por conta
            metrics.push({
                userId: TEST_USER_ID,
                account: accountId,
                date: date,
                period: "day",
                metrics: {
                    totalEvents: totalMetrics.sentCount + totalMetrics.deliveredCount + 
                                totalMetrics.openCount + totalMetrics.clickCount + 
                                totalMetrics.bounceCount + totalMetrics.unsubscribeCount + 
                                totalMetrics.complaintCount,
                    sentCount: totalMetrics.sentCount,
                    deliveredCount: totalMetrics.deliveredCount,
                    openCount: totalMetrics.openCount,
                    uniqueOpenCount: totalMetrics.uniqueOpenCount,
                    clickCount: totalMetrics.clickCount,
                    uniqueClickCount: totalMetrics.uniqueClickCount,
                    bounceCount: totalMetrics.bounceCount,
                    unsubscribeCount: totalMetrics.unsubscribeCount,
                    complaintCount: totalMetrics.complaintCount,
                    
                    // Cálculo de taxas
                    deliveryRate: totalMetrics.sentCount > 0 ? 
                                (totalMetrics.deliveredCount / totalMetrics.sentCount) * 100 : 0,
                    openRate: totalMetrics.deliveredCount > 0 ? 
                            (totalMetrics.openCount / totalMetrics.deliveredCount) * 100 : 0,
                    clickRate: totalMetrics.deliveredCount > 0 ? 
                            (totalMetrics.clickCount / totalMetrics.deliveredCount) * 100 : 0,
                    clickToOpenRate: totalMetrics.openCount > 0 ? 
                                    (totalMetrics.clickCount / totalMetrics.openCount) * 100 : 0,
                    bounceRate: totalMetrics.sentCount > 0 ? 
                                (totalMetrics.bounceCount / totalMetrics.sentCount) * 100 : 0,
                    unsubscribeRate: totalMetrics.deliveredCount > 0 ? 
                                    (totalMetrics.unsubscribeCount / totalMetrics.deliveredCount) * 100 : 0,
                    complaintRate: totalMetrics.deliveredCount > 0 ? 
                                (totalMetrics.complaintCount / totalMetrics.deliveredCount) * 100 : 0
                }
            });
        }
    }
    
    // 3. Métricas mensais
    // Agrupar todas as campanhas do mês de maio de 2025
    const accountIds = [...new Set(campaigns.map(c => c.account.toString()))];
    
    for (const accountId of accountIds) {
        const accountCampaigns = campaigns.filter(c => c.account.toString() === accountId);
        
        // Somar as métricas de todas as campanhas desta conta neste mês
        const totalMetrics = {
            sentCount: 0,
            deliveredCount: 0,
            openCount: 0,
            uniqueOpenCount: 0,
            clickCount: 0,
            uniqueClickCount: 0,
            bounceCount: 0,
            unsubscribeCount: 0,
            complaintCount: 0
        };
        
        accountCampaigns.forEach(campaign => {
            totalMetrics.sentCount += campaign.metrics.sentCount;
            totalMetrics.deliveredCount += campaign.metrics.deliveredCount;
            totalMetrics.openCount += campaign.metrics.openCount;
            totalMetrics.uniqueOpenCount += Math.floor(campaign.metrics.openCount * 0.85);
            totalMetrics.clickCount += campaign.metrics.clickCount;
            totalMetrics.uniqueClickCount += Math.floor(campaign.metrics.clickCount * 0.9);
            totalMetrics.bounceCount += campaign.metrics.bounceCount;
            totalMetrics.unsubscribeCount += campaign.metrics.unsubscribeCount;
            totalMetrics.complaintCount += campaign.metrics.complaintCount;
        });
        
        // Métricas mensais por conta
        metrics.push({
            userId: TEST_USER_ID,
            account: accountId,
            date: new Date(2025, 4, 1), // 1º de maio de 2025
            period: "month",
            metrics: {
                totalEvents: totalMetrics.sentCount + totalMetrics.deliveredCount + 
                            totalMetrics.openCount + totalMetrics.clickCount + 
                            totalMetrics.bounceCount + totalMetrics.unsubscribeCount + 
                            totalMetrics.complaintCount,
                sentCount: totalMetrics.sentCount,
                deliveredCount: totalMetrics.deliveredCount,
                openCount: totalMetrics.openCount,
                uniqueOpenCount: totalMetrics.uniqueOpenCount,
                clickCount: totalMetrics.clickCount,
                uniqueClickCount: totalMetrics.uniqueClickCount,
                bounceCount: totalMetrics.bounceCount,
                unsubscribeCount: totalMetrics.unsubscribeCount,
                complaintCount: totalMetrics.complaintCount,
                
                // Cálculo de taxas
                deliveryRate: totalMetrics.sentCount > 0 ? 
                            (totalMetrics.deliveredCount / totalMetrics.sentCount) * 100 : 0,
                openRate: totalMetrics.deliveredCount > 0 ? 
                        (totalMetrics.openCount / totalMetrics.deliveredCount) * 100 : 0,
                clickRate: totalMetrics.deliveredCount > 0 ? 
                        (totalMetrics.clickCount / totalMetrics.deliveredCount) * 100 : 0,
                clickToOpenRate: totalMetrics.openCount > 0 ? 
                                (totalMetrics.clickCount / totalMetrics.openCount) * 100 : 0,
                bounceRate: totalMetrics.sentCount > 0 ? 
                            (totalMetrics.bounceCount / totalMetrics.sentCount) * 100 : 0,
                unsubscribeRate: totalMetrics.deliveredCount > 0 ? 
                                (totalMetrics.unsubscribeCount / totalMetrics.deliveredCount) * 100 : 0,
                complaintRate: totalMetrics.deliveredCount > 0 ? 
                            (totalMetrics.complaintCount / totalMetrics.deliveredCount) * 100 : 0
            }
        });
    }
    
    // Inserir métricas em lotes para maior segurança
    let createdMetrics = [];
    for (const metric of metrics) {
        try {
            const createdMetric = await Metrics.create(metric);
            createdMetrics.push(createdMetric);
        } catch (error) {
            console.error(`Erro ao criar métrica:`, error.message);
        }
    }
    
    console.log(`${createdMetrics.length} registros de métricas criados.`);
    return createdMetrics;
}

// Função principal
async function main() {
    try {
        await connectToDatabase();
        await clearExistingData();
        
        // Criar dados
        const accounts = await createAccounts();
        const campaigns = await createCampaigns(accounts);
        
        if (campaigns.length === 0) {
            throw new Error("Não foi possível criar campanhas. Verifique os índices no modelo de Campaign.");
        }
        
        const emails = await createEmails(campaigns, accounts);
        const events = await createEvents(campaigns, emails);
        const metricsData = await createMetrics(campaigns, emails);
        
        console.log('Geração de dados concluída com sucesso!');
        console.log('-----------------------------------');
        console.log(`Contas: ${accounts.length}`);
        console.log(`Campanhas: ${campaigns.length}`);
        console.log(`Templates de Email: ${emails.length}`);
        console.log(`Eventos: ${events.length} (limitados para não sobrecarregar o banco)`);
        console.log(`Métricas: ${metricsData.length}`);
        
        // Encerrar conexão com o MongoDB
        await mongoose.connection.close();
        console.log('Conexão com o MongoDB fechada.');
        
    } catch (error) {
        console.error('Erro durante a execução:', error);
        try {
            await mongoose.connection.close();
        } catch (err) {
            // Ignorar erro ao fechar conexão
        }
    }
}

// Executar a função principal
main();
