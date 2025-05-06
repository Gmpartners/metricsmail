const { Account, Campaign, Email, Event } = require('../models');
const responseUtils = require('../utils/responseUtil');

/**
 * Processa webhooks do Mautic
 * Formato do payload Mautic:
 * {
 *   "mautic.email_on_send": [{ ... }],
 *   "mautic.email_on_open": [{ ... }],
 *   "mautic.email_on_click": [{ ... }]
 * }
 */
const processMauticWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    // Buscar a conta pelo webhookId
    const account = await Account.findOne({ webhookId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Webhook não encontrado');
    }
    
    // Registrar o payload recebido para fins de depuração
    console.log('Mautic webhook payload:', JSON.stringify(req.body));
    
    // Armazenar eventos processados
    const processedEvents = [];
    
    // Processar evento de envio de email
    if (req.body['mautic.email_on_send']) {
      const sendEvents = Array.isArray(req.body['mautic.email_on_send']) 
        ? req.body['mautic.email_on_send'] 
        : [req.body['mautic.email_on_send']];
      
      for (const event of sendEvents) {
        const eventResult = await processMauticSendEvent(account, event);
        if (eventResult) processedEvents.push(eventResult);
      }
    }
    
    // Processar evento de abertura de email
    if (req.body['mautic.email_on_open']) {
      const openEvents = Array.isArray(req.body['mautic.email_on_open']) 
        ? req.body['mautic.email_on_open'] 
        : [req.body['mautic.email_on_open']];
      
      for (const event of openEvents) {
        const eventResult = await processMauticOpenEvent(account, event);
        if (eventResult) processedEvents.push(eventResult);
      }
    }
    
    // Processar evento de clique em link
    if (req.body['mautic.email_on_click']) {
      const clickEvents = Array.isArray(req.body['mautic.email_on_click']) 
        ? req.body['mautic.email_on_click'] 
        : [req.body['mautic.email_on_click']];
      
      for (const event of clickEvents) {
        const eventResult = await processMauticClickEvent(account, event);
        if (eventResult) processedEvents.push(eventResult);
      }
    }
    
    // Se não encontramos eventos conhecidos, tentar processar como payload bruto para debug
    if (processedEvents.length === 0) {
      console.log('Nenhum evento processado. Tentando analisar o payload bruto');
      
      // Verifica se há algum dado no payload que pareça um evento
      for (const key in req.body) {
        if (Array.isArray(req.body[key])) {
          console.log(`Encontrado possível evento do tipo: ${key}`);
          
          // Registrar evento de debug
          const debug = {
            type: key,
            data: req.body[key]
          };
          
          processedEvents.push({
            id: 'debug',
            type: 'debug',
            eventType: key,
            data: 'Evento registrado para debug'
          });
        }
      }
    }
    
    // Atualizar a data da última sincronização da conta
    account.lastSync = new Date();
    await account.save();
    
    return responseUtils.success(res, {
      success: true,
      message: `${processedEvents.length} evento(s) processado(s) com sucesso`,
      events: processedEvents
    });
  } catch (err) {
    console.error('Erro ao processar webhook do Mautic:', err);
    return responseUtils.serverError(res, err);
  }
};

/**
 * Processa um evento de envio de email do Mautic
 * Formato esperado:
 * {
 *   "email": { "id": 45, "name": "...", "subject": "..." },
 *   "contact": { "id": 12, "email": "...", "firstname": "...", "lastname": "..." },
 *   "tokens": { ... },
 *   "contentHash": "...",
 *   "idHash": "...",
 *   "subject": "...",
 *   "timestamp": "..."
 * }
 */
const processMauticSendEvent = async (account, eventData) => {
  try {
    if (!eventData.email || !eventData.email.id || !eventData.contact) {
      console.log('Dados incompletos no evento de envio. Tentando processar com dados limitados.');
      // Tentamos extrair dados necessários, mesmo que parciais
      const emailId = eventData.email?.id?.toString() || 'unknown';
      const contactEmail = eventData.contact?.email || 'unknown@example.com';
      
      console.log(`Processando com dados parciais: Email ID=${emailId}, Contact=${contactEmail}`);
      
      // Cria uma campanha padrão
      let campaign = await Campaign.findOne({ 
        userId: account.userId,
        account: account._id,
        externalId: 'default'
      });
      
      if (!campaign) {
        campaign = await Campaign.create({
          userId: account.userId,
          account: account._id,
          name: 'Campanha padrão Mautic',
          externalId: 'default',
          provider: 'mautic',
          status: 'sent' // Valor válido do enum
        });
      }
      
      // Cria um email padrão
      let email = await Email.findOne({
        userId: account.userId,
        account: account._id,
        externalId: emailId
      });
      
      if (!email) {
        email = await Email.create({
          userId: account.userId,
          account: account._id,
          campaign: campaign._id,
          subject: eventData.email?.subject || eventData.subject || 'Email Mautic',
          externalId: emailId,
          provider: 'mautic',
          fromName: 'Mautic',
          fromEmail: 'no-reply@example.com',
          htmlContent: '<p>Conteúdo não disponível</p>'
        });
      }
      
      // Criar o evento com dados limitados
      const timestamp = new Date();
      const uniqueExternalId = `${account._id}-${emailId}-unknown-send-${timestamp.getTime()}`;
      
      // Criar o evento
      const event = await Event.create({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        email: email._id,
        eventType: 'send',
        timestamp: timestamp,
        contactEmail: contactEmail,
        contactId: 'unknown',
        provider: 'mautic',
        externalId: uniqueExternalId,
        metadata: {
          originalPayload: eventData,
          isPartialData: true
        }
      });
      
      // Atualizar métricas do email
      email.metrics.sentCount += 1;
      await email.save();
      
      return {
        id: event._id,
        type: 'send',
        email: email.subject,
        contact: contactEmail,
        isPartialData: true
      };
    }

    // A partir daqui, temos dados completos
    console.log(`Processando evento de envio completo: Email ID=${eventData.email.id}, Contact=${eventData.contact.email}`);

    // Buscar ou criar a campanha
    // No Mautic, um email pode não estar associado a uma campanha específica
    // Usamos uma campanha "padrão" para emails sem campanha
    let campaignId = eventData.email.campaign_id || 'default';
    let campaignName = eventData.email.campaign_name || 'Emails sem campanha';
    
    let campaign = await Campaign.findOne({ 
      userId: account.userId,
      account: account._id,
      externalId: campaignId
    });
    
    if (!campaign) {
      campaign = await Campaign.create({
        userId: account.userId,
        account: account._id,
        name: campaignName,
        externalId: campaignId,
        provider: 'mautic',
        status: 'sent' // Valor válido do enum
      });
    }
    
    // Buscar ou criar o email
    const emailId = eventData.email.id.toString();
    let email = await Email.findOne({
      userId: account.userId,
      account: account._id,
      externalId: emailId
    });
    
    if (!email) {
      email = await Email.create({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        subject: eventData.email.subject || eventData.subject || 'Sem assunto',
        externalId: emailId,
        provider: 'mautic',
        fromName: eventData.email.fromName || 'Mautic',
        fromEmail: eventData.email.fromAddress || 'no-reply@example.com',
        htmlContent: '<p>Conteúdo não disponível</p>'
      });
    }
    
    // Criar ID único para este evento
    const contactId = eventData.contact.id ? eventData.contact.id.toString() : 'unknown';
    const contactEmail = eventData.contact.email || 'unknown@example.com';
    const timestamp = eventData.timestamp ? new Date(eventData.timestamp) : new Date();
    const uniqueExternalId = `${account._id}-${emailId}-${contactId}-send-${timestamp.getTime()}`;
    
    // Verificar se já existe um evento idêntico para evitar duplicação
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'send',
      contactId: contactId,
      externalId: uniqueExternalId
    });
    
    if (existingEvent) {
      console.log('Evento de envio já registrado:', uniqueExternalId);
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'send',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      metadata: {
        originalPayload: eventData
      }
    });
    
    // Atualizar métricas do email
    email.metrics.sentCount += 1;
    await email.save();
    
    return {
      id: event._id,
      type: 'send',
      email: email.subject,
      contact: contactEmail
    };
  } catch (err) {
    console.error('Erro ao processar evento de envio:', err);
    return null;
  }
};

/**
 * Processa um evento de abertura de email do Mautic
 * Formato esperado:
 * {
 *   "stat": {
 *     "id": 123,
 *     "email": { "id": 45, "name": "...", "subject": "..." },
 *     "lead": { "id": 26, "email": "...", "firstname": "...", "lastname": "..." },
 *     "dateRead": "...",
 *     "trackingHash": "..."
 *   }
 * }
 */
const processMauticOpenEvent = async (account, eventData) => {
  try {
    if (!eventData.stat || !eventData.stat.email || !eventData.stat.lead) {
      console.log('Dados incompletos no evento de abertura. Tentando processar com dados limitados.');
      return null;
    }
    
    const stat = eventData.stat;
    
    // Buscar ou criar a campanha
    // No Mautic, um email pode não estar associado a uma campanha específica
    // Usamos uma campanha "padrão" para emails sem campanha
    let campaignId = stat.email.campaign_id || 'default';
    let campaignName = stat.email.campaign_name || 'Emails sem campanha';
    
    let campaign = await Campaign.findOne({ 
      userId: account.userId,
      account: account._id,
      externalId: campaignId
    });
    
    if (!campaign) {
      campaign = await Campaign.create({
        userId: account.userId,
        account: account._id,
        name: campaignName,
        externalId: campaignId,
        provider: 'mautic',
        status: 'sent' // Valor válido do enum
      });
    }
    
    // Buscar ou criar o email
    const emailId = stat.email.id.toString();
    let email = await Email.findOne({
      userId: account.userId,
      account: account._id,
      externalId: emailId
    });
    
    if (!email) {
      email = await Email.create({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        subject: stat.email.subject || 'Sem assunto',
        externalId: emailId,
        provider: 'mautic',
        fromName: stat.email.fromName || 'Mautic',
        fromEmail: stat.email.fromAddress || 'no-reply@example.com',
        htmlContent: '<p>Conteúdo não disponível</p>'
      });
    }
    
    // Criar ID único para este evento
    const contactId = stat.lead.id ? stat.lead.id.toString() : 'unknown';
    const contactEmail = stat.lead.email || 'unknown@example.com';
    const timestamp = stat.dateRead ? new Date(stat.dateRead) : new Date();
    const uniqueExternalId = `${account._id}-${emailId}-${contactId}-open-${timestamp.getTime()}`;
    
    // Verificar se já existe um evento idêntico para evitar duplicação
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'open',
      contactId: contactId,
      externalId: uniqueExternalId
    });
    
    if (existingEvent) {
      console.log('Evento de abertura já registrado:', uniqueExternalId);
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'open',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      metadata: {
        trackingHash: stat.trackingHash,
        originalPayload: eventData
      }
    });
    
    // Atualizar métricas do email
    email.metrics.openCount += 1;
    await email.save();
    
    return {
      id: event._id,
      type: 'open',
      email: email.subject,
      contact: contactEmail
    };
  } catch (err) {
    console.error('Erro ao processar evento de abertura:', err);
    return null;
  }
};

/**
 * Processa um evento de clique em email do Mautic
 * Formato esperado:
 * {
 *   "stat": {
 *     "id": 123,
 *     "email": { "id": 45, "name": "...", "subject": "..." },
 *     "lead": { "id": 26, "email": "...", "firstname": "...", "lastname": "..." },
 *     "url": "https://exemplo.com/link-clicado",
 *     "dateClicked": "...",
 *     "trackingHash": "..."
 *   }
 * }
 */
const processMauticClickEvent = async (account, eventData) => {
  try {
    if (!eventData.stat || !eventData.stat.email || !eventData.stat.lead) {
      console.log('Dados incompletos no evento de clique. Tentando processar com dados limitados.');
      return null;
    }
    
    const stat = eventData.stat;
    
    // Buscar ou criar a campanha
    // No Mautic, um email pode não estar associado a uma campanha específica
    // Usamos uma campanha "padrão" para emails sem campanha
    let campaignId = stat.email.campaign_id || 'default';
    let campaignName = stat.email.campaign_name || 'Emails sem campanha';
    
    let campaign = await Campaign.findOne({ 
      userId: account.userId,
      account: account._id,
      externalId: campaignId
    });
    
    if (!campaign) {
      campaign = await Campaign.create({
        userId: account.userId,
        account: account._id,
        name: campaignName,
        externalId: campaignId,
        provider: 'mautic',
        status: 'sent' // Valor válido do enum
      });
    }
    
    // Buscar ou criar o email
    const emailId = stat.email.id.toString();
    let email = await Email.findOne({
      userId: account.userId,
      account: account._id,
      externalId: emailId
    });
    
    if (!email) {
      email = await Email.create({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        subject: stat.email.subject || 'Sem assunto',
        externalId: emailId,
        provider: 'mautic',
        fromName: stat.email.fromName || 'Mautic',
        fromEmail: stat.email.fromAddress || 'no-reply@example.com',
        htmlContent: '<p>Conteúdo não disponível</p>'
      });
    }
    
    // Criar ID único para este evento
    const contactId = stat.lead.id ? stat.lead.id.toString() : 'unknown';
    const contactEmail = stat.lead.email || 'unknown@example.com';
    const timestamp = stat.dateClicked ? new Date(stat.dateClicked) : new Date();
    const clickUrl = stat.url || '';
    const uniqueExternalId = `${account._id}-${emailId}-${contactId}-click-${timestamp.getTime()}`;
    
    // Verificar se já existe um evento idêntico para evitar duplicação
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'click',
      contactId: contactId,
      externalId: uniqueExternalId
    });
    
    if (existingEvent) {
      console.log('Evento de clique já registrado:', uniqueExternalId);
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: 'click',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      url: clickUrl,
      metadata: {
        trackingHash: stat.trackingHash,
        originalPayload: eventData
      }
    });
    
    // Atualizar métricas do email
    email.metrics.clickCount += 1;
    await email.save();
    
    return {
      id: event._id,
      type: 'click',
      email: email.subject,
      contact: contactEmail,
      url: clickUrl
    };
  } catch (err) {
    console.error('Erro ao processar evento de clique:', err);
    return null;
  }
};

module.exports = {
  processMauticWebhook
};
