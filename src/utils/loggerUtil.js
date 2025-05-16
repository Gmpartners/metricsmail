/**
 * Utilitário para limpar e formatar logs
 */

/**
 * Sanitiza um objeto de payload, removendo HTML e conteúdo longo
 * @param {Object} payload - O payload a ser sanitizado
 * @param {number} maxLength - Comprimento máximo para strings (default: 100)
 * @param {boolean} hideHtml - Se deve ocultar conteúdo HTML (default: true)
 * @returns {Object} - Payload sanitizado
 */
const sanitizePayload = (payload, maxLength = 100, hideHtml = true) => {
  // Se não for um objeto ou for nulo, retorna como está
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  // Clona o objeto para não modificar o original
  const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };

  // Percorre as propriedades do objeto
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];

    // Se for um objeto ou array, processa recursivamente
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value, maxLength, hideHtml);
    } 
    // Se for uma string, limita o tamanho e remove HTML se necessário
    else if (typeof value === 'string') {
      // Verifica se parece com HTML
      if (hideHtml && (value.includes('<html') || value.includes('<!DOCTYPE') || 
          value.includes('<body') || value.includes('<div') || 
          value.includes('<p>') || value.includes('<script'))) {
        sanitized[key] = '[HTML Content Removed]';
      } 
      // Verifica se é um conteúdo longo de texto
      else if (value.length > maxLength) {
        sanitized[key] = value.substring(0, maxLength) + '... [content truncated]';
      }
    }
  });

  return sanitized;
};

/**
 * Loga um payload Mautic de forma limpa, removendo conteúdo HTML
 * @param {Object} payload - O payload a ser logado
 */
const logMauticWebhook = (payload) => {
  // Mostrar apenas os tipos de eventos presentes
  const eventTypes = Object.keys(payload);
  
  console.log('Mautic webhook recebido com os seguintes tipos de eventos:', eventTypes);

  // Cria uma versão sanitizada do payload para logging
  const sanitizedPayload = sanitizePayload(payload);
  
  console.log('Payload sanitizado:', JSON.stringify(sanitizedPayload, null, 2));
};

module.exports = {
  sanitizePayload,
  logMauticWebhook
};

/**
 * Loga informações de evento de forma concisa e útil para depuração
 * @param {string} eventType - Tipo de evento (send, open, click, etc.)
 * @param {Object} eventData - Dados do evento
 * @param {Object} metadata - Metadados adicionais
 */
const logEventProcessing = (eventType, eventData, metadata = {}) => {
  let eventInfo = {
    type: eventType,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  // Adiciona informações específicas dependendo do tipo de evento
  switch (eventType) {
    case 'page_on_hit':
      if (eventData.hit) {
        eventInfo.sourceId = eventData.hit.sourceId || 'N/A';
        eventInfo.emailId = eventData.hit.email?.id || 'N/A';
        eventInfo.leadId = eventData.hit.lead?.id || 'N/A';
        eventInfo.leadEmail = eventData.hit.lead?.email || 'unknown';
        eventInfo.url = eventData.hit.url || eventData.hit.query?.page_url || 'N/A';
        eventInfo.dateHit = eventData.hit.dateHit || 'N/A';
      }
      break;
    
    case 'email_on_click':
      if (eventData.stat) {
        eventInfo.statId = eventData.stat.id || 'N/A';
        eventInfo.emailId = eventData.stat.email?.id || 'N/A';
        eventInfo.leadId = eventData.stat.lead?.id || 'N/A';
        eventInfo.leadEmail = eventData.stat.lead?.email || 'unknown';
        eventInfo.url = eventData.stat.url || 'N/A';
        eventInfo.dateClicked = eventData.stat.dateClicked || 'N/A';
      }
      break;
    
    case 'email_on_open':
      if (eventData.stat) {
        eventInfo.statId = eventData.stat.id || 'N/A';
        eventInfo.emailId = eventData.stat.email?.id || 'N/A';
        eventInfo.leadId = eventData.stat.lead?.id || 'N/A';
        eventInfo.leadEmail = eventData.stat.lead?.email || 'unknown';
        eventInfo.dateRead = eventData.stat.dateRead || 'N/A';
      }
      break;
    
    case 'email_on_send':
      eventInfo.emailId = eventData.email?.id || 'N/A';
      eventInfo.emailSubject = eventData.email?.subject || 'N/A';
      eventInfo.leadId = eventData.contact?.id || 'N/A';
      eventInfo.leadEmail = eventData.contact?.email || 'unknown';
      eventInfo.timestamp = eventData.timestamp || 'N/A';
      break;
      
    default:
      // Para outros tipos de eventos, apenas mostra um resumo básico
      eventInfo.data = sanitizePayload(eventData, 50, true);
  }
  
  console.log(`[EVENT ${eventType}]`, JSON.stringify(eventInfo));
};

module.exports = {
  sanitizePayload,
  logMauticWebhook,
  logEventProcessing
};
