/**
 * Middleware para extrair o userId do header da requisição
 * 
 * Este middleware captura o userId enviado pelo frontend (Firebase)
 * e o disponibiliza para todos os controllers usarem para filtrar dados
 */
const userIdMiddleware = (req, res, next) => {
  // Extrair o userId do header
  const userId = req.headers['user-id'];
  
  // Verificar se o userId está presente
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User ID é obrigatório para acessar esta API'
    });
  }
  
  // Adicionar userId ao objeto req para uso nos controllers
  req.userId = userId;
  
  // Log para debugging (remover em produção)
  console.log(`Requisição recebida para o usuário: ${userId}`);
  
  // Chamar o próximo middleware ou controller
  next();
};

module.exports = userIdMiddleware;