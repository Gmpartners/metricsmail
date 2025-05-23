const mongoose = require('mongoose');

// Esquema para templates de email
const emailSchema = new mongoose.Schema({
  // Campo userId para identificar o proprietário do email
  userId: {
    type: String,
    required: [true, 'O ID do usuário é obrigatório'],
    index: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'A conta é obrigatória']
  },
  name: {
    type: String,
    required: [true, 'O nome do email é obrigatório'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'O assunto é obrigatório'],
    trim: true
  },
  fromName: {
    type: String,
    required: [true, 'O nome do remetente é obrigatório'],
    trim: true
  },
  fromEmail: {
    type: String,
    required: [true, 'O email do remetente é obrigatório'],
    trim: true,
    lowercase: true
  },
  replyTo: {
    type: String,
    trim: true,
    lowercase: true
  },
  textContent: {
    type: String
  },
  htmlContent: {
    type: String,
    required: [true, 'O conteúdo HTML é obrigatório']
  },
  externalId: {
    type: String,
    required: [true, 'O ID externo é obrigatório']
  },
  provider: {
    type: String,
    required: [true, 'O provedor é obrigatório'],
    enum: ['mautic', 'klaviyo', 'activecampaign', 'mailchimp']
  },
  // Métricas específicas deste template
  metrics: {
    recipientsCount: {
      type: Number,
      default: 0
    },
    sentCount: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    openCount: {
      type: Number,
      default: 0
    },
    uniqueOpenCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    },
    uniqueClickCount: {
      type: Number,
      default: 0
    },
    bounceCount: {
      type: Number,
      default: 0
    },
    unsubscribeCount: {
      type: Number,
      default: 0
    },
    complaintCount: {
      type: Number,
      default: 0
    }
  },
  // Metadados adicionais
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices
emailSchema.index({ userId: 1, account: 1 });
emailSchema.index({ userId: 1, account: 1, externalId: 1 }, { unique: true });

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;
