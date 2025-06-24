const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const accountSchema = new mongoose.Schema({
  accountID: {
    type: Number,
    default: function() {
      return Math.floor(Date.now() / 1000);
    },
    index: true
  },
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
    username: {
      type: String,
      required: [true, 'O usuário é obrigatório']
    },
    password: {
      type: String,
      required: [true, 'A senha é obrigatória'],
      select: false
    },
    apiKey: {
      type: String,
      select: false
    },
    apiSecret: {
      type: String,
      select: false
    },
    accessToken: {
      type: String,
      select: false
    },
    refreshToken: {
      type: String,
      select: false
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

accountSchema.index({ userId: 1, provider: 1 });
accountSchema.index({ userId: 1, status: 1 });

accountSchema.methods.getMauticEmails = async function() {
  try {
    const accountWithCredentials = await mongoose.model('Account').findById(this._id).select('+credentials.password');
    const username = accountWithCredentials.credentials.username;
    const password = accountWithCredentials.credentials.password;
    
    let baseUrl = this.url;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    const apiUrl = `${baseUrl}/api/emails`;
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const axiosConfig = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };
    
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

accountSchema.methods.getMauticLeadsByDate = async function(startDate, endDate) {
  try {
    const accountWithCredentials = await mongoose.model('Account').findById(this._id).select('+credentials.password');
    const username = accountWithCredentials.credentials.username;
    const password = accountWithCredentials.credentials.password;
    
    let baseUrl = this.url;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    const apiUrl = `${baseUrl}/api/contacts?where[0][col]=dateAdded&where[0][expr]=gte&where[0][val]=${encodeURIComponent(startDate)}&where[1][col]=dateAdded&where[1][expr]=lte&where[1][val]=${encodeURIComponent(endDate)}&limit=1`;
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const axiosConfig = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };
    
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

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
