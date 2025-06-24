/**
 * Utilitários para padronização de respostas da API
 */

// Resposta de sucesso
const success = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

// Resposta de erro
const error = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Resposta para recursos não encontrados
const notFound = (res, message = 'Recurso não encontrado') => {
  return error(res, message, 404);
};

// Resposta para erros de servidor
const serverError = (res, err) => {
  console.error('Erro do servidor:', err);
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message || 'Erro interno do servidor';
    
  return error(res, message, 500);
};

module.exports = {
  success,
  error,
  notFound,
  serverError
};