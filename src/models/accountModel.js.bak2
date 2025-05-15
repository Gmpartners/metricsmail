const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Esquema para contas de provedores de email marketing
const accountSchema = new mongoose.Schema({
  // Campo userId para identificar o proprietário da conta
  userId: {
    type: String,
    required: [true, 'O ID do usuário é obrigatório'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'O nome da conta é obrigatório'],
    trim: true
  },
  provider: {
    type: String,
    required: [true, 'O provedor é obrigatório'],
    enum: ['mautic', 'klaviyo', 'activecampaign', 'mailchimp'],
    default: 'mautic'
  },
  url: {
    type: String,
    required: [true, 'A URL é obrigatória'],
    trim: true
  },
  credentials: {
    // Armazenamos as credenciais de forma segura
    username: {
      type: String,
      required: [true, 'O usuário é obrigatório']
    },
    password: {
      type: String,
      required: [true, 'A senha é obrigatória'],
      select: false // Não retorna a senha em consultas
    },
    apiKey: {
      type: String,
      select: false // Não retorna a chave da API em consultas
    },
    apiSecret: {
      type: String,
      select: false // Não retorna o segredo da API em consultas
    },
    accessToken: {
      type: String,
      select: false // Não retorna o token de acesso em consultas
    },
    refreshToken: {
      type: String,
      select: false // Não retorna o token de atualização em consultas
    },
    tokenExpiry: {
      type: Date
    }
  },
  webhookId: {
    type: String,
    default: null
  },
  webhookUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'inactive'
  },
  lastSync: {
    type: Date,
    default: null
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
accountSchema.index({ userId: 1, provider: 1 });
accountSchema.index({ userId: 1, status: 1 });

// Virtual para o número de campanhas
accountSchema.virtual('campaignsCount', {
  ref: 'Campaign',
  localField: '_id',
  foreignField: 'account',
  count: true
});

// Método para listar campanhas do Mautic
accountSchema.methods.getMauticCampaigns = async function() {
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
    
    // URL da API de campanhas
    const apiUrl = `${baseUrl}/api/campaigns`;
    
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
    
    // Fazer a requisição
    const response = await axios.get(apiUrl, axiosConfig);
    
    if (response.status === 200) {
      return { 
        success: true, 
        campaigns: response.data.campaigns || [],
        total: response.data.total || 0
      };
    } else {
      return { success: false, message: `Falha ao buscar campanhas: Código ${response.status}` };
    }
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    let errorMessage = 'Falha ao buscar campanhas';
    
    if (error.response) {
      errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Falha na autenticação'}`;
    } else if (error.request) {
      errorMessage = 'Falha na conexão: servidor não responde';
    } else {
      errorMessage = error.message || 'Erro desconhecido ao buscar campanhas';
    }
    
    return { success: false, message: errorMessage, campaigns: [] };
  }
};

// Método para listar emails do Mautic
accountSchema.methods.getMauticEmails = async function() {
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
    
    // URL da API de emails
    const apiUrl = `${baseUrl}/api/emails`;
    
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
    
    // Fazer a requisição
    const response = await axios.get(apiUrl, axiosConfig);
    
    if (response.status === 200) {
      return { 
        success: true, 
        emails: response.data.emails || [],
        total: response.data.total || 0
      };
    } else {
      return { success: false, message: `Falha ao buscar emails: Código ${response.status}` };
    }
  } catch (error) {
    console.error('Erro ao buscar emails:', error);
    let errorMessage = 'Falha ao buscar emails';
    
    if (error.response) {
      errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Falha na autenticação'}`;
    } else if (error.request) {
      errorMessage = 'Falha na conexão: servidor não responde';
    } else {
      errorMessage = error.message || 'Erro desconhecido ao buscar emails';
    }
    
    return { success: false, message: errorMessage, emails: [] };
  }
};

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
