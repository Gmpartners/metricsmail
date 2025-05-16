// Este script modifica o formato de log para ser mais conciso e fácil de analisar

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Função para gerar um ID único para eventos
function generateEventId(eventType, emailId, leadId) {
  return `${eventType}-${emailId}-${leadId}-${Date.now()}`;
}

// Registro de eventos para detecção de duplicação
const eventRegistry = new Map();

// Substituindo console.log para formatar logs de eventos
console.log = function(...args) {
  const message = args.join(' ');
  
  // Detectar logs de eventos e formatá-los de forma simplificada
  if (message.includes('[EVENT ') || message.includes('mautic.')) {
    try {
      // Tentar extrair informações de evento
      const eventMatch = message.match(/\[EVENT ([^\]]+)\]/) || message.match(/mautic\.([^\s]+)/);
      if (eventMatch) {
        const eventType = eventMatch[1];
        
        // Extrair dados JSON se disponíveis
        let jsonData = {};
        const jsonMatch = message.match(/({.*})/);
        if (jsonMatch) {
          try {
            jsonData = JSON.parse(jsonMatch[1]);
          } catch (e) {
            // Se não conseguir analisar JSON, continue com o log normal
          }
        }
        
        // Extrair informações relevantes
        const emailId = jsonData.emailId || 'N/A';
        const leadId = jsonData.leadId || 'N/A';
        const timestamp = jsonData.timestamp || new Date().toISOString();
        
        // Criar ID de evento para detecção de duplicação
        const eventId = generateEventId(eventType, emailId, leadId);
        
        // Verificar duplicação
        if (eventRegistry.has(eventId)) {
          originalConsoleLog(`[DUPLICADO] Evento ${eventType} - Email ID: ${emailId}, Lead ID: ${leadId}, Timestamp: ${timestamp}`);
          return;
        }
        
        // Registrar evento
        eventRegistry.set(eventId, {
          type: eventType,
          timestamp: new Date(),
          data: jsonData
        });
        
        // Limpar registros antigos (manter apenas os últimos 1000)
        if (eventRegistry.size > 1000) {
          const oldestKeys = Array.from(eventRegistry.keys()).slice(0, 100);
          oldestKeys.forEach(key => eventRegistry.delete(key));
        }
        
        // Log simplificado
        originalConsoleLog(`[EVENTO] ${eventType} - Email ID: ${emailId}, Lead ID: ${leadId}, Timestamp: ${timestamp}`);
        return;
      }
    } catch (error) {
      // Em caso de erro, voltar ao comportamento padrão
    }
  }
  
  // Para outros logs, usar o comportamento padrão
  originalConsoleLog(...args);
};

// Exportar funções para uso externo
module.exports = {
  originalLog: originalConsoleLog,
  originalError: originalConsoleError,
  resetLogFunctions: () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }
};

// Mensagem para indicar que o logging simplificado está ativo
originalConsoleLog('[SISTEMA] Formato de log simplificado ativado');
