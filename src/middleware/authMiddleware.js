/**
 * Middleware de autenticação
 * Este é um middleware básico simulado para autenticação.
 * Em uma implementação real, você iria verificar o JWT ou outra forma de autenticação.
 */

// Simulação básica de autenticação
const authenticate = (req, res, next) => {
  // No mundo real, você validaria um token JWT aqui
  // Por enquanto, apenas simulamos para desenvolvimento
  
  // Verifica se existe um token de autorização na requisição
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Acesso não autorizado. Token não fornecido.'
    });
  }
  
  // Simula um usuário autenticado
  req.user = {
    id: '1',
    name: 'Usuário de Desenvolvimento',
    email: 'dev@example.com',
    role: 'admin'
  };
  
  next();
};

// Middleware para verificar permissões de usuário
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. Usuário não autenticado.'
      });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso proibido. Permissão insuficiente.'
      });
    }
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};