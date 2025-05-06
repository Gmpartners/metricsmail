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
      // Adicionar outros tipos conforme necessário
    };
    
    const eventType = eventTypeMap[mauticEvent.type] || 'other';
    
    // Extrair informações do email e campanha
    const mauticCampaignId = mauticEvent.campaign ? mauticEvent.campaign.id : null;
    const mauticEmailId = mauticEvent.email ? mauticEvent.email.id : null;
    
    // Buscar ou criar a campanha associada
    let campaign;
    if (mauticCampaignId) {
      campaign = await Campaign.findOne({ 
        account: account._id, 
        externalId: mauticCampaignId 
      });
      
      if (!campaign) {
        // Criar campanha se não existir
        campaign = await Campaign.create({
          userId: account.userId,
          account: account._id,
          name: mauticEvent.campaign.name || `Campanha ${mauticCampaignId}`,
          externalId: mauticCampaignId,
          provider: 'mautic'
        });
      }
    }
    
    // Buscar ou criar o email associado
    let email;
    if (mauticEmailId && campaign) {
      email = await Email.findOne({
        campaign: campaign._id,
        externalId: mauticEmailId
      });
      
      if (!email) {
        // Criar email se não existir
        email = await Email.create({
          userId: account.userId,
          campaign: campaign._id,
          subject: mauticEvent.email.subject || `Email ${mauticEmailId}`,
          externalId: mauticEmailId,
          provider: 'mautic'
        });
      }
    }
    
    // Criar o evento
    const event = new Event({
      userId: account.userId,
      account: account._id,
      campaign: campaign ? campaign._id : null,
      email: email ? email._id : null,
      type: eventType,
      metadata: {
        contactEmail: mauticEvent.contact ? mauticEvent.contact.email : null,
        ipAddress: mauticEvent.ipAddress || null,
        timestamp: mauticEvent.timestamp || new Date(),
        originalPayload: mauticEvent
      }
    });
    
    await event.save();
    
    // Atualizar a data da última sincronização da conta
    account.lastSync = new Date();
    await account.save();
    
    return responseUtils.success(res, { 
      success: true, 
      message: 'Evento processado com sucesso' 
    });
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
    return responseUtils.serverError(res, err);
  }
};

module.exports = {
  processMauticWebhook
};
