/**
 * Utilitário para processar parâmetros de filtro múltiplo
 */

/**
 * Processa uma string de IDs separados por vírgula em um array
 * @param {string} idString - String de IDs separados por vírgula
 * @returns {Array|null} - Array de IDs ou null se não houver IDs válidos
 */
const processIdArray = (idString) => {
  if (!idString) return null;
  
  const idArray = idString.split(',').filter(id => id.trim());
  return idArray.length > 0 ? idArray : null;
};

/**
 * Processa parâmetros de múltiplos IDs para usar em filtros de consulta
 * @param {Object} queryParams - Objeto com parâmetros de consulta
 * @returns {Object} - Objeto com arrays de IDs processados
 */
const processMultipleIdsParams = (queryParams) => {
  const { accountIds, campaignIds, emailIds } = queryParams;
  
  return {
    accountIdArray: processIdArray(accountIds),
    campaignIdArray: processIdArray(campaignIds),
    emailIdArray: processIdArray(emailIds)
  };
};

/**
 * Constrói um filtro para consultas com base nos parâmetros múltiplos
 * @param {string} userId - ID do usuário
 * @param {Object} params - Parâmetros da consulta
 * @returns {Object} - Filtro para usar em consultas MongoDB
 */
const buildFilter = (userId, params) => {
  const { startDate, endDate, accountIds, campaignIds, emailIds } = params;
  
  // Validar datas
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  // Construir filtro base
  const filter = { userId };
  
  // Adicionar filtro de data se fornecido
  if (start && end) {
    filter.timestamp = { $gte: start, $lte: end };
  } else if (start) {
    filter.timestamp = { $gte: start };
  } else if (end) {
    filter.timestamp = { $lte: end };
  }
  
  // Processar filtros de IDs múltiplos
  const { accountIdArray, campaignIdArray, emailIdArray } = processMultipleIdsParams(params);
  
  // Adicionar filtros de IDs se fornecidos
  if (accountIdArray) {
    filter.accountId = { $in: accountIdArray };
  }
  
  if (campaignIdArray) {
    filter.campaignId = { $in: campaignIdArray };
  }
  
  if (emailIdArray) {
    filter.emailId = { $in: emailIdArray };
  }
  
  return filter;
};

module.exports = {
  processIdArray,
  processMultipleIdsParams,
  buildFilter
};
