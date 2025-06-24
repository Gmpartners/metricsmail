/**
 * Utilitários para paginação
 */

/**
 * Configura os parâmetros de paginação a partir da requisição
 * @param {Object} req - Objeto de requisição Express
 * @param {Number} defaultLimit - Limite padrão de itens por página
 * @returns {Object} Configuração de paginação
 */
const getPaginationParams = (req, defaultLimit = 20) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || defaultLimit;
  const skip = (page - 1) * limit;
  
  return {
    page,
    limit,
    skip
  };
};

/**
 * Monta a resposta paginada
 * @param {Array} data - Array de dados
 * @param {Number} total - Total de itens
 * @param {Number} page - Página atual
 * @param {Number} limit - Limite de itens por página
 * @returns {Object} Resposta paginada
 */
const paginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const currentPage = page > totalPages ? totalPages : page;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  
  return {
    data,
    pagination: {
      total,
      totalPages,
      currentPage,
      limit,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      previousPage: hasPreviousPage ? currentPage - 1 : null
    }
  };
};

/**
 * Middleware de paginação para mongoose
 * @param {Model} model - Modelo Mongoose
 * @param {Object} filter - Filtros para a consulta
 * @param {Object} options - Opções adicionais (populate, sort, etc)
 * @returns {Function} Middleware Express
 */
const paginateMiddleware = (model, filter = {}, options = {}) => {
  return async (req, res, next) => {
    try {
      const { page, limit, skip } = getPaginationParams(req);
      
      // Opções para a consulta
      const queryOptions = {
        skip,
        limit,
        ...options
      };
      
      // Consultas
      const total = await model.countDocuments(filter);
      const data = await model.find(filter, null, queryOptions);
      
      // Adicionar à requisição
      req.paginatedResults = paginatedResponse(data, total, page, limit);
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  getPaginationParams,
  paginatedResponse,
  paginateMiddleware
};