/**
 * Middleware de autenticação simples com API Key
 */

const API_KEY = 'MAaDylN2bs0Y01Ep66';

const apiKeyAuth = (req, res, next) => {
  // Verificar se a API key está presente no header
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado. API Key inválida ou não fornecida.'
    });
  }
  
  // API Key válida, prosseguir
  next();
};

module.exports = apiKeyAuth;
