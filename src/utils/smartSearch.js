/**
 * Busca inteligente que funciona com e sem acentos
 * @param {string} searchTerm - Termo digitado pelo usuário (com ou sem acentos)
 * @returns {Object} - Filtros para MongoDB
 */
const createSmartSearchFilter = (searchTerm, fields = ['name', 'subject', 'fromName', 'fromEmail']) => {
  if (!searchTerm || !searchTerm.trim()) {
    return {};
  }

  const normalizedTerm = normalizeText(searchTerm.trim());
  const originalTerm = searchTerm.trim();
  
  // Criar regex para busca com acentos
  const accentRegex = createAccentFlexibleRegex(normalizedTerm);
  
  // Criar filtro que busca nos dois sentidos
  const searchConditions = [];
  
  fields.forEach(field => {
    // Busca exata (termo original)
    searchConditions.push({
      [field]: { $regex: originalTerm, $options: 'i' }
    });
    
    // Busca normalizada (com suporte a variações de acentos)
    searchConditions.push({
      [field]: accentRegex
    });
  });
  
  return {
    $or: searchConditions
  };
};

/**
 * Normaliza texto removendo acentos
 */
const normalizeText = (text) => {
  if (!text) return '';
  
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[çÇ]/g, (match) => match === 'ç' ? 'c' : 'C')
    .replace(/[ñÑ]/g, (match) => match === 'ñ' ? 'n' : 'N');
};

/**
 * Cria regex que aceita múltiplas variações de acentos
 */
const createAccentFlexibleRegex = (normalizedText) => {
  let pattern = normalizedText
    .replace(/c/gi, '[cç]')
    .replace(/n/gi, '[nñ]')
    .replace(/a/gi, '[aáàâãäå]')
    .replace(/e/gi, '[eéèêë]')
    .replace(/i/gi, '[iíìîï]')
    .replace(/o/gi, '[oóòôõöø]')
    .replace(/u/gi, '[uúùûü]')
    .replace(/y/gi, '[yý]');
  
  return new RegExp(pattern, 'i');
};

/**
 * Função para destacar termos encontrados (para o frontend)
 */
const highlightSearchTerms = (text, searchTerm) => {
  if (!text || !searchTerm) return text;
  
  const normalizedSearch = normalizeText(searchTerm);
  const regex = createAccentFlexibleRegex(normalizedSearch);
  
  return text.replace(regex, (match) => `<mark>${match}</mark>`);
};

module.exports = {
  createSmartSearchFilter,
  normalizeText,
  highlightSearchTerms
};
