const mongoose = require("mongoose");
const Account = require("../models/accountModel");
const cleanLogsUtil = require("../utils/cleanLogsUtil");
const loggerUtils = require("../utils/loggerUtil");
const Email = require("../models/emailModel");
const Event = require("../models/eventModel");
const responseUtils = require('../utils/responseUtil');

/**
 * Processa webhooks do Mautic
 * Formato do payload Mautic:
 * {
 *   "mautic.email_on_send": [{ ... }],
 *   "mautic.email_on_open": [{ ... }],
 *   "mautic.email_on_click": [{ ... }],
 *   "mautic.email_on_bounce": [{ ... }],
 *   "mautic.email_on_unsubscribe": [{ ... }],
 *   "mautic.page_on_hit": [{ ... }]
 * }
 */
const processMauticWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    // Buscar a conta pelo webhookId
    const account = await Account.findOne({ webhookUrl: { $regex: webhookId + "$" } });
    
    if (!account) {
      return responseUtils.notFound(res, 'Webhook não encontrado');
    }
    
    // Registrar o payload recebido para fins de depuração
    loggerUtils.logMauticWebhook(req.body);
    
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
    
    // Processar evento de página visitada (também é contabilizado como clique)
    if (req.body['mautic.page_on_hit']) {
      const pageHitEvents = Array.isArray(req.body['mautic.page_on_hit']) 
        ? req.body['mautic.page_on_hit'] 
        : [req.body['mautic.page_on_hit']];
      
      for (const event of pageHitEvents) {
        const eventResult = await processMauticPageHitEvent(account, event);
        if (eventResult) processedEvents.push(eventResult);
      }
    }
    
    // Processar evento de bounce (rejeição de email)
    if (req.body['mautic.email_on_bounce']) {
      const bounceEvents = Array.isArray(req.body['mautic.email_on_bounce']) 
        ? req.body['mautic.email_on_bounce'] 
        : [req.body['mautic.email_on_bounce']];
      
      for (const event of bounceEvents) {
        const eventResult = await processMauticBounceEvent(account, event);
        if (eventResult) processedEvents.push(eventResult);
      }
    }
    
    // Processar evento de unsubscribe (cancelamento)
    if (req.body['mautic.email_on_unsubscribe']) {
      const unsubscribeEvents = Array.isArray(req.body['mautic.email_on_unsubscribe']) 
        ? req.body['mautic.email_on_unsubscribe'] 
        : [req.body['mautic.email_on_unsubscribe']];
      
      for (const event of unsubscribeEvents) {
        const eventResult = await processMauticUnsubscribeEvent(account, event);
        if (eventResult) processedEvents.push(eventResult);
      }
    }
    
    // Processar evento de cancelamento de inscrição (lead_channel_subscription_changed)
    if (req.body["mautic.lead_channel_subscription_changed"]) {
      const subscriptionEvents = Array.isArray(req.body["mautic.lead_channel_subscription_changed"]) 
        ? req.body["mautic.lead_channel_subscription_changed"] 
        : [req.body["mautic.lead_channel_subscription_changed"]];
      
      for (const event of subscriptionEvents) {
        // Verificar se é um evento de cancelamento de inscrição (unsubscribe)
        if (event.new_status === "unsubscribed" && event.channel === "email") {
          const eventResult = await processMauticSubscriptionChangeEvent(account, event);
          if (eventResult) processedEvents.push(eventResult);
        }
      }
    }

    // Se não encontramos eventos conhecidos, tentar processar como payload bruto para debug
    if (processedEvents.length === 0) {
      console.log('Nenhum evento processado. Tentando analisar o payload bruto');
      
      // Verifica se há algum dado no payload que pareça um evento
      for (const key in req.body) {
        if (Array.isArray(req.body[key])) {
          console.log(`Encontrado possível evento do tipo: ${key}`);
          
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
 * Processa um evento de visita em página do Mautic (clique completo)
 */
const processMauticPageHitEvent = async (account, eventData) => {
  loggerUtils.logEventProcessing("page_on_hit", eventData);
  try {
    // Verificar se temos os dados necessários
    if (!eventData.hit || !eventData.hit.email || !eventData.hit.lead) {
      console.log('Dados incompletos no evento de visita à página.');
      return null;
    }

    const hit = eventData.hit;
    
    // Garantir que o evento veio de um email (source = email)
    if (hit.source !== 'email') {
      console.log(`Evento de visita à página com source=${hit.source} ignorado.`);
      return null;
    }
    
    // Buscar ou criar o email
    const emailId = hit.email.id.toString();
    let email = await Email.findOne({
      userId: account.userId,
      account: account._id,
      externalId: emailId
    });
    
    if (!email) {
      email = await Email.create({
        userId: account.userId,
        account: account._id,
        name: hit.email.name || 'Sem nome',
        subject: hit.email.subject || 'Sem assunto',
        externalId: emailId,
        provider: 'mautic',
        fromName: hit.email.fromName || 'Mautic',
        fromEmail: hit.email.fromAddress || 'no-reply@example.com',
        htmlContent: '<p>Conteúdo não disponível</p>'
      });
    }
    
    // Criar ID único para este evento
    const contactId = hit.lead.id ? hit.lead.id.toString() : 'unknown';
    const contactEmail = (hit.lead && hit.lead.fields && hit.lead.fields.core && 
                          hit.lead.fields.core.email && hit.lead.fields.core.email.value) || 
                          'unknown@example.com';
    const timestamp = hit.dateHit ? new Date(hit.dateHit) : (eventData.timestamp ? new Date(eventData.timestamp) : new Date());
    
    // Extrair a URL da page hit (se disponível)
    const pageUrl = hit.url || hit.query?.page_url || 'URL não disponível';

    // Criar identificador único para rastrear cliques únicos
    const uniqueIdentifier = `${account._id}-${emailId}-${contactId}-click-${encodeURIComponent(pageUrl)}`;
    const uniqueExternalId = `${uniqueIdentifier}-${timestamp.getTime()}`;
    
    // Verificar se já existe QUALQUER clique deste contato neste link específico do email
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'click',
      contactId: contactId,
      url: pageUrl
    });
    
    // Determinar se esta é a primeira interação deste tipo para este contato+email+link
    const isFirstInteraction = !existingEvent;
    
    // Verificar se já existe este evento específico para evitar duplicação
    const exactEvent = await Event.findOne({
      externalId: uniqueExternalId
    });
    
    if (exactEvent) {
      loggerUtils.logDuplicateEvent("page_hit", uniqueExternalId, { emailId, contactId, timestamp });
      return null;
    }
    
    // Criar o evento - nós tratamos page_on_hit como um clique "avançado"
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'click', // Tratamos como clique
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      url: pageUrl,
      isFirstInteraction: isFirstInteraction,
      uniqueIdentifier: uniqueIdentifier,
      metadata: {
        hitId: hit.id,
        eventType: 'page_on_hit',
        originalPayload: eventData,
        query: hit.query
      }
    });
    
    // Atualizar métricas do email
    const updateFields = {
      'metrics.clickCount': 1
    };
    
    if (isFirstInteraction) {
      updateFields['metrics.uniqueClickCount'] = 1;
    }
    
    await Email.findByIdAndUpdate(email._id, { $inc: updateFields });
    
    console.log(`Evento page_on_hit processado como clique: ${pageUrl}`);
    
    return {
      id: event._id,
      type: 'click',
      email: email.subject,
      contact: contactEmail,
      url: pageUrl,
      isFirstInteraction: isFirstInteraction,
      source: 'page_on_hit'
    };
  } catch (err) {
    console.error('Erro ao processar evento de page hit:', err);
    return null;
  }
};

/**
 * Processa um evento de envio de email do Mautic
 */
const processMauticSendEvent = async (account, eventData) => {
  loggerUtils.logEventProcessing("email_on_send", eventData);
  try {
    if (!eventData.email || !eventData.email.id || !eventData.contact) {
      console.log('Dados incompletos no evento de envio.');
      return null;
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
        name: eventData.email.name || 'Sem nome',
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
    await Email.findByIdAndUpdate(email._id, { $inc: { "metrics.sentCount": 1 } });
    
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
 */
const processMauticOpenEvent = async (account, eventData) => {
  loggerUtils.logEventProcessing("email_on_open", eventData);
  try {
    if (!eventData.stat || !eventData.stat.email || !eventData.stat.lead) {
      console.log('Dados incompletos no evento de abertura.');
      return null;
    }
    
    const stat = eventData.stat;
    
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
        name: stat.email.name || 'Sem nome',
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
    const contactEmail = (stat.lead && stat.lead.fields && stat.lead.fields.core && 
                          stat.lead.fields.core.email && stat.lead.fields.core.email.value) || 
                          'unknown@example.com';
    const timestamp = stat.dateRead ? new Date(stat.dateRead) : new Date();
    
    // Criar identificador único para contato-email para rastrear interações únicas
    const uniqueIdentifier = `${account._id}-${emailId}-${contactId}-open`;
    const uniqueExternalId = `${uniqueIdentifier}-${timestamp.getTime()}`;
    
    // Verificar se já existe QUALQUER evento de abertura para este contato e email
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'open',
      contactId: contactId
    });
    
    // Determinar se esta é a primeira interação deste tipo para este contato+email
    const isFirstInteraction = !existingEvent;
    
    // Verificar se já existe este evento específico para evitar duplicação
    const exactEvent = await Event.findOne({
      externalId: uniqueExternalId
    });
    
    if (exactEvent) {
      loggerUtils.logDuplicateEvent("open", uniqueExternalId, { emailId, contactId, timestamp });
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'open',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      isFirstInteraction: isFirstInteraction,
      uniqueIdentifier: uniqueIdentifier,
      metadata: {
        trackingHash: stat.trackingHash,
        originalPayload: eventData
      }
    });
    
    // Atualizar métricas do email
    const updateFields = {
      'metrics.openCount': 1
    };
    
    if (isFirstInteraction) {
      updateFields['metrics.uniqueOpenCount'] = 1;
    }
    
    await Email.findByIdAndUpdate(email._id, { $inc: updateFields });
    
    return {
      id: event._id,
      type: 'open',
      email: email.subject,
      contact: contactEmail,
      isFirstInteraction: isFirstInteraction
    };
  } catch (err) {
    console.error('Erro ao processar evento de abertura:', err);
    return null;
  }
};

/**
 * Processa um evento de clique em email do Mautic
 */
const processMauticClickEvent = async (account, eventData) => {
  loggerUtils.logEventProcessing("email_on_click", eventData);
  try {
    if (!eventData.stat || !eventData.stat.email || !eventData.stat.lead) {
      console.log('Dados incompletos no evento de clique.');
      return null;
    }
    
    const stat = eventData.stat;
    
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
        name: stat.email.name || 'Sem nome',
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
    const contactEmail = (stat.lead && stat.lead.fields && stat.lead.fields.core && 
                          stat.lead.fields.core.email && stat.lead.fields.core.email.value) || 
                          'unknown@example.com';
    const timestamp = stat.dateClicked ? new Date(stat.dateClicked) : new Date();
    const clickUrl = stat.url || '';
    
    // Criar identificador único para contato-email-url para rastrear cliques únicos
    const uniqueIdentifier = `${account._id}-${emailId}-${contactId}-click-${encodeURIComponent(clickUrl)}`;
    const uniqueExternalId = `${uniqueIdentifier}-${timestamp.getTime()}`;
    
    // Verificar se já existe QUALQUER clique deste contato neste link específico do email
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'click',
      contactId: contactId,
      url: clickUrl
    });
    
    // Determinar se esta é a primeira interação deste tipo para este contato+email+link
    const isFirstInteraction = !existingEvent;
    
    // Verificar se já existe este evento específico para evitar duplicação
    const exactEvent = await Event.findOne({
      externalId: uniqueExternalId
    });
    
    if (exactEvent) {
      loggerUtils.logDuplicateEvent("click", uniqueExternalId, { emailId, contactId, timestamp });
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'click',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      url: clickUrl,
      isFirstInteraction: isFirstInteraction,
      uniqueIdentifier: uniqueIdentifier,
      metadata: {
        trackingHash: stat.trackingHash,
        originalPayload: eventData
      }
    });
    
    // Atualizar métricas do email
    const updateFields = {
      'metrics.clickCount': 1
    };
    
    if (isFirstInteraction) {
      updateFields['metrics.uniqueClickCount'] = 1;
    }
    
    await Email.findByIdAndUpdate(email._id, { $inc: updateFields });
    
    return {
      id: event._id,
      type: 'click',
      email: email.subject,
      contact: contactEmail,
      url: clickUrl,
      isFirstInteraction: isFirstInteraction
    };
  } catch (err) {
    console.error('Erro ao processar evento de clique:', err);
    return null;
  }
};

/**
 * Processa um evento de bounce (rejeição) de email do Mautic
 */
const processMauticBounceEvent = async (account, eventData) => {
  try {
    if (!eventData.stat || !eventData.stat.email || !eventData.stat.lead) {
      console.log('Dados incompletos no evento de bounce.');
      return null;
    }
    
    const stat = eventData.stat;
    
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
        name: stat.email.name || 'Sem nome',
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
    const contactEmail = (stat.lead && stat.lead.fields && stat.lead.fields.core && 
                          stat.lead.fields.core.email && stat.lead.fields.core.email.value) || 
                          'unknown@example.com';
    const timestamp = eventData.timestamp ? new Date(eventData.timestamp) : new Date();
    const bounceType = stat.bounceType || (eventData.reason && eventData.reason.type) || 'hard';
    const bounceMessage = stat.bounceMessage || (eventData.reason && eventData.reason.message) || '';
    
    // Criar identificador único para contato-email para rastrear bounces únicos
    const uniqueIdentifier = `${account._id}-${emailId}-${contactId}-bounce`;
    const uniqueExternalId = `${uniqueIdentifier}-${timestamp.getTime()}`;
    
    // Verificar se já existe QUALQUER bounce para este contato e email
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'bounce',
      contactId: contactId
    });
    
    // Determinar se esta é a primeira interação deste tipo para este contato+email
    const isFirstInteraction = !existingEvent;
    
    // Verificar se já existe este evento específico para evitar duplicação
    const exactEvent = await Event.findOne({
      externalId: uniqueExternalId
    });
    
    if (exactEvent) {
      loggerUtils.logDuplicateEvent("bounce", uniqueExternalId, { emailId, contactId, timestamp });
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'bounce',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      bounceType: bounceType,
      bounceReason: bounceMessage,
      isFirstInteraction: isFirstInteraction,
      uniqueIdentifier: uniqueIdentifier,
      metadata: {
        bounceType: bounceType,
        bounceMessage: bounceMessage,
        originalPayload: eventData
      }
    });
    
    // Atualizar métricas do email
    await Email.findByIdAndUpdate(email._id, { $inc: { 'metrics.bounceCount': 1 } });
    
    return {
      id: event._id,
      type: 'bounce',
      email: email.subject,
      contact: contactEmail,
      bounceType: bounceType
    };
  } catch (err) {
    console.error('Erro ao processar evento de bounce:', err);
    return null;
  }
};

/**
 * Processa um evento de unsubscribe (cancelamento) de email do Mautic
 */
const processMauticUnsubscribeEvent = async (account, eventData) => {
  try {
    if (!eventData.stat || !eventData.stat.email || !eventData.stat.lead) {
      console.log('Dados incompletos no evento de unsubscribe.');
      return null;
    }
    
    const stat = eventData.stat;
    
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
        name: stat.email.name || 'Sem nome',
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
    const contactEmail = (stat.lead && stat.lead.fields && stat.lead.fields.core && 
                          stat.lead.fields.core.email && stat.lead.fields.core.email.value) || 
                          'unknown@example.com';
    const timestamp = stat.dateUnsubscribed ? new Date(stat.dateUnsubscribed) : (eventData.timestamp ? new Date(eventData.timestamp) : new Date());
    const comments = eventData.preferences && eventData.preferences.comments ? eventData.preferences.comments : '';
    
    // Criar identificador único para contato-email para rastrear unsubscribe únicos
    const uniqueIdentifier = `${account._id}-${emailId}-${contactId}-unsubscribe`;
    const uniqueExternalId = `${uniqueIdentifier}-${timestamp.getTime()}`;
    
    // Verificar se já existe QUALQUER unsubscribe para este contato e email
    const existingEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'unsubscribe',
      contactId: contactId
    });
    
    // Determinar se esta é a primeira interação deste tipo para este contato+email
    const isFirstInteraction = !existingEvent;
    
    // Verificar se já existe este evento específico para evitar duplicação
    const exactEvent = await Event.findOne({
      externalId: uniqueExternalId
    });
    
    if (exactEvent) {
      loggerUtils.logDuplicateEvent("unsubscribe", uniqueExternalId, { emailId, contactId, timestamp });
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'unsubscribe',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      isFirstInteraction: isFirstInteraction,
      uniqueIdentifier: uniqueIdentifier,
      metadata: {
        comments: comments,
        originalPayload: eventData
      }
    });
    
    // Atualizar métricas do email
    await Email.findByIdAndUpdate(email._id, { $inc: { 'metrics.unsubscribeCount': 1 } });
    
    return {
      id: event._id,
      type: 'unsubscribe',
      email: email.subject,
      contact: contactEmail,
      comments: comments
    };
  } catch (err) {
    console.error('Erro ao processar evento de unsubscribe:', err);
    return null;
  }
};

/**
 * Processa evento de mudança de inscrição (subscription changed/unsubscribe) do Mautic
 */
const processMauticSubscriptionChangeEvent = async (account, eventData) => {
  loggerUtils.logEventProcessing("lead_channel_subscription_changed", eventData);
  
  try {
    // Verificar se o evento é realmente um unsubscribe
    if (eventData.new_status !== 'unsubscribed' || eventData.channel !== 'email') {
      console.log('Evento de mudança de inscrição não é um unsubscribe. Status:', eventData.new_status);
      return null;
    }
    
    if (!eventData.contact || !eventData.contact.fields || !eventData.contact.fields.core) {
      console.log('Dados incompletos no evento de cancelamento de inscrição.');
      return null;
    }
    
    // Extrair informações do contato
    const contact = eventData.contact;
    const contactId = contact.id.toString();
    const contactEmail = contact.fields.core.email?.value || 'unknown';
    
    // Data do evento
    const timestamp = eventData.timestamp ? new Date(eventData.timestamp) : new Date();
    
    // Buscar o último email enviado para esse contato
    const lastSendEvent = await Event.findOne({
      userId: account.userId,
      account: account._id,
      contactEmail: contactEmail,
      eventType: 'send'
    }).sort({ timestamp: -1 });
    
    let email = null;
    if (lastSendEvent) {
      email = await Email.findById(lastSendEvent.email);
    }
    
    // Se não tivermos um email, criar um genérico
    if (!email) {
      email = await Email.create({
        userId: account.userId,
        account: account._id,
        name: 'Email não identificado',
        subject: 'Email não identificado',
        externalId: 'unknown-subscription-change',
        provider: 'mautic',
        fromName: 'Mautic',
        fromEmail: 'no-reply@example.com',
        htmlContent: '<p>Conteúdo não disponível</p>'
      });
    }
    
    // Criar ID único para o evento para evitar duplicação
    const uniqueExternalId = `${contactId}-unsubscribe-${timestamp.getTime()}`;
    
    // Verificar se o evento já foi registrado
    const exactEvent = await Event.findOne({
      externalId: uniqueExternalId
    });
    
    if (exactEvent) {
      loggerUtils.logDuplicateEvent("unsubscribe", uniqueExternalId, { 
        emailId: email.externalId, 
        contactId, 
        timestamp 
      });
      return null;
    }
    
    // Criar o evento
    const event = await Event.create({
      userId: account.userId,
      account: account._id,
      email: email._id,
      eventType: 'unsubscribe',
      timestamp: timestamp,
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      metadata: {
        oldStatus: eventData.old_status,
        newStatus: eventData.new_status,
        channel: eventData.channel
      }
    });
    
    console.log(`Evento de cancelamento de inscrição processado: ${contactEmail}`);
    
    return {
      id: event._id,
      type: 'unsubscribe',
      email: email.subject,
      contact: contactEmail
    };
    
  } catch (err) {
    console.error('Erro ao processar evento de cancelamento de inscrição:', err);
    return null;
  }
};

module.exports = {
  processMauticWebhook
};
