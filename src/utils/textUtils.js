/**
 * Remove acentos de um texto para facilitar buscas
 * @param {string} text - Texto com acentos
 * @returns {string} - Texto sem acentos
 */
const removeAccents = (text) => {
  if (!text) return '';
  
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .replace(/[çÇ]/g, (match) => match === 'ç' ? 'c' : 'C') // Cedilha específica
    .replace(/[ñÑ]/g, (match) => match === 'ñ' ? 'n' : 'N'); // Eñe específico
};

/**
 * Cria regex para busca que aceita tanto com quanto sem acentos
 * @param {string} search - Termo de busca
 * @returns {RegExp} - Regex que aceita variações com/sem acentos
 */
const createAccentInsensitiveRegex = (search) => {
  if (!search) return null;
  
  // Normalizar o termo de busca
  const normalized = removeAccents(search);
  
  // Criar padrão que aceita ambas as versões
  let pattern = normalized
    .replace(/c/gi, '[cç]')
    .replace(/n/gi, '[nñ]')
    .replace(/a/gi, '[aáàâãä]')
    .replace(/e/gi, '[eéèêë]')
    .replace(/i/gi, '[iíìîï]')
    .replace(/o/gi, '[oóòôõö]')
    .replace(/u/gi, '[uúùûü]');
  
  return new RegExp(pattern, 'i');
};

module.exports = {
  removeAccents,
  createAccentInsensitiveRegex
};
