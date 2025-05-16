
// Método para listar leads do Mautic por data
accountSchema.methods.getMauticLeadsByDate = async function(startDate, endDate) {
  try {
    // Obter credenciais completas incluindo senha
    const accountWithCredentials = await mongoose.model('Account').findById(this._id).select('+credentials.password');
    const username = accountWithCredentials.credentials.username;
    const password = accountWithCredentials.credentials.password;
    
    // Preparar a URL base da API
    let baseUrl = this.url;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    
    // Remover barra final se existir
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // URL da API de contatos com filtros
    const apiUrl = `${baseUrl}/api/contacts?where[0][col]=dateAdded&where[0][expr]=gte&where[0][val]=${encodeURIComponent(startDate)}&where[1][col]=dateAdded&where[1][expr]=lte&where[1][val]=${encodeURIComponent(endDate)}&limit=1`;
    
    // Criar token de autenticação Basic
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // Configurar axios
    const axiosConfig = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Apenas em dev! Remover em produção!
      })
    };
    
    // Fazer a requisição - só precisamos do total, não dos dados completos
    const response = await axios.get(apiUrl, axiosConfig);
    
    if (response.status === 200) {
      return { 
        success: true, 
        total: parseInt(response.data.total || 0)
      };
    } else {
      return { success: false, message: `Falha ao buscar leads: Código ${response.status}` };
    }
  } catch (error) {
    console.error('Erro ao buscar leads:', error);
    let errorMessage = 'Falha ao buscar leads';
    
    if (error.response) {
      errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Falha na autenticação'}`;
    } else if (error.request) {
      errorMessage = 'Falha na conexão: servidor não responde';
    } else {
      errorMessage = error.message || 'Erro desconhecido ao buscar leads';
    }
    
    return { success: false, message: errorMessage, total: 0 };
  }
};
