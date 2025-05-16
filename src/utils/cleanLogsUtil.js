/**
 * Utilitário simples para remover HTML dos logs
 */

/**
 * Remove conteúdo HTML de um objeto de logs 
 * @param {Object} data - O objeto a ser limpo de HTML
 * @returns {Object} - Objeto limpo
 */
function removeHtmlFromLogs(data) {
  if (!data) return data;
  
  // Se for um objeto simples ou array, crie uma cópia
  const cleaned = Array.isArray(data) ? [...data] : typeof data === 'object' ? {...data} : data;
  
  // Se não for um objeto, não há o que limpar
  if (typeof cleaned !== 'object') return cleaned;
  
  // Percorrer cada propriedade do objeto
  for (const key in cleaned) {
    if (cleaned.hasOwnProperty(key)) {
      const value = cleaned[key];
      
      // Se o valor for objeto ou array, processar recursivamente
      if (value && typeof value === 'object') {
        cleaned[key] = removeHtmlFromLogs(value);
      }
      // Se for uma string, verificar se contém HTML
      else if (typeof value === 'string') {
        // Verifica se parece HTML
        if (value.includes('<!DOCTYPE') || 
            value.includes('<html') || 
            value.includes('<body') || 
            value.includes('<head') ||
            (value.includes('<') && value.includes('>') && 
            (value.includes('</div>') || value.includes('</p>') || value.includes('</span>')))) {
          cleaned[key] = '[HTML Content Removed]';
        }
        // Se for uma string muito longa, truncar
        else if (value.length > 500) {
          cleaned[key] = value.substring(0, 100) + '... [long content truncated]';
        }
      }
    }
  }
  
  return cleaned;
}

module.exports = {
  removeHtmlFromLogs
};
