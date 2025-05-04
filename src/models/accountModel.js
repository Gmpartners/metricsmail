const mongoose = require('mongoose');

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
  webhookSecret: {
    type: String,
    default: null,
    select: false
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

// Método para testar a conexão
accountSchema.methods.testConnection = async function() {
  // Esta função será implementada quando tivermos os provedores
  return { success: true, message: 'Conexão simulada com sucesso' };
};

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;