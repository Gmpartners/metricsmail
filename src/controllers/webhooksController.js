const { Account, Campaign, Email, Event } = require('../models');
const responseUtils = require('../utils/responseUtil');

// Processar webhook do Mautic
const processMauticWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    // Buscar a conta pelo webhookId
    const account = await Account.findOne({ webhookId });
    
    if (!account) {
      return responseUtils.notFound(res, 'Webhook não encontrado');
    }
    
    // Extrair os dados do evento do payload
    const mauticEvent = req.body;
    
    // Verificar se o payload tem a estrutura esperada
    if (!mauticEvent || !mauticEvent.type) {
      return responseUtils.error(res, 'Payload inválido');
    }
    
    // Mapear tipos de evento do Mautic para nossos tipos internos
    const eventTypeMap = {
      'email.sent': 'send',
      'email.open': 'open',
      'email.click': 'click',
      'email.bounce': 'bounce',
      'email.unsubscribe': 'unsubscribe'
    };
    
    const eventType = eventTypeMap[mauticEvent.type] || 'send';
    
    // Extrair informações do email e campanha
    const mauticCampaignId = mauticEvent.campaign ? mauticEvent.campaign.id : 'default-campaign';
    const mauticEmailId = mauticEvent.email ? mauticEvent.email.id : 'default-email';
    const contactEmail = mauticEvent.contact ? mauticEvent.contact.email : 'unknown@example.com';
    const contactId = mauticEvent.contact ? mauticEvent.contact.id : 'unknown-contact';
    
    // Buscar ou criar a campanha associada
    let campaign;
    campaign = await Campaign.findOne({ 
      userId: account.userId,
      account: account._id, 
      externalId: mauticCampaignId 
    });
    
    if (!campaign) {
      // Criar campanha se não existir
      campaign = await Campaign.create({
        userId: account.userId,
        account: account._id,
        name: mauticEvent.campaign ? mauticEvent.campaign.name : 'Campanha Padrão',
        externalId: mauticCampaignId,
        provider: 'mautic',
        status: 'active'
      });
    }
    
    // Buscar ou criar o email associado
    let email;
    email = await Email.findOne({
      userId: account.userId,
      campaign: campaign._id,
      externalId: mauticEmailId
    });
    
    if (!email) {
      // Criar email com campos obrigatórios
      email = await Email.create({
        userId: account.userId,
        account: account._id,
        campaign: campaign._id,
        subject: mauticEvent.email ? mauticEvent.email.subject : 'Email Padrão',
        externalId: mauticEmailId,
        provider: 'mautic',
        htmlContent: mauticEvent.email && mauticEvent.email.content ? mauticEvent.email.content : '<p>Conteúdo não disponível</p>',
        fromEmail: mauticEvent.email && mauticEvent.email.fromEmail ? mauticEvent.email.fromEmail : 'noreply@example.com',
        fromName: mauticEvent.email && mauticEvent.email.fromName ? mauticEvent.email.fromName : 'Sistema Mautic'
      });
    }
    
    // Gerar um ID único para o evento externo
    const uniqueExternalId = `${account._id}-${mauticEmailId}-${contactId}-${eventType}-${Date.now()}`;
    
    // Criar o evento
    const eventData = {
      userId: account.userId,
      account: account._id,
      campaign: campaign._id,
      email: email._id,
      eventType: eventType,
      timestamp: mauticEvent.timestamp ? new Date(mauticEvent.timestamp) : new Date(),
      contactEmail: contactEmail,
      contactId: contactId,
      provider: 'mautic',
      externalId: uniqueExternalId,
      ipAddress: mauticEvent.ipAddress || '0.0.0.0',
      metadata: {
        originalPayload: mauticEvent
      }
    };
    
    // Para eventos de clique, adicionar URL se disponível
    if (eventType === 'click' && mauticEvent.url) {
      eventData.url = mauticEvent.url;
    }
    
    // Para eventos de bounce, adicionar tipo e motivo se disponíveis
    if (eventType === 'bounce' && mauticEvent.bounceType) {
      eventData.bounceType = mauticEvent.bounceType;
      eventData.bounceReason = mauticEvent.bounceReason || 'Motivo desconhecido';
    }
    
    const event = new Event(eventData);
    await event.save();
    
    // Atualizar métricas do email
    if (eventType === 'send') {
      email.metrics.sentCount += 1;
    } else if (eventType === 'open') {
      email.metrics.openCount += 1;
    } else if (eventType === 'click') {
      email.metrics.clickCount += 1;
    } else if (eventType === 'bounce') {
      email.metrics.bounceCount += 1;
    } else if (eventType === 'unsubscribe') {
      email.metrics.unsubscribeCount += 1;
    }
    
    await email.save();
    
    // Atualizar a data da última sincronização da conta
    account.lastSync = new Date();
    await account.save();
    
    return responseUtils.success(res, { 
      success: true, 
      message: 'Evento processado com sucesso',
      eventId: event._id,
      eventType: eventType 
    });
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  processMauticWebhook
};
