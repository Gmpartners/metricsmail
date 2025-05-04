const mongoose = require('mongoose');

// Esquema para campanhas de email marketing
const campaignSchema = new mongoose.Schema({
  // Campo userId para identificar o proprietário da campanha
  userId: {
    type: String,
    required: [true, 'O ID do usuário é obrigatório'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'O nome da campanha é obrigatório'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'A conta é obrigatória']
  },
  // ID da campanha no provedor externo
  externalId: {
    type: String,
    required: [true, 'O ID externo é obrigatório']
  },
  // Status da campanha
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'],
    default: 'draft'
  },
  // Datas importantes
  scheduledDate: {
    type: Date
  },
  sentDate: {
    type: Date
  },
  // Métricas resumidas
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
    clickCount: {
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
  // Tags/categorias
  tags: [{
    type: String,
    trim: true
  }],
  // Metadados adicionais específicos de cada provedor
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
campaignSchema.index({ userId: 1, account: 1, externalId: 1 }, { unique: true });
campaignSchema.index({ userId: 1, account: 1, status: 1 });
campaignSchema.index({ userId: 1, sentDate: -1 });

// Virtuals
campaignSchema.virtual('emails', {
  ref: 'Email',
  localField: '_id',
  foreignField: 'campaign'
});

// Métodos
// Calcular as taxas de desempenho
campaignSchema.methods.calculateRates = function() {
  const m = this.metrics;
  
  return {
    deliveryRate: m.sentCount > 0 ? (m.deliveredCount / m.sentCount) * 100 : 0,
    openRate: m.deliveredCount > 0 ? (m.openCount / m.deliveredCount) * 100 : 0,
    clickRate: m.openCount > 0 ? (m.clickCount / m.openCount) * 100 : 0,
    clickToOpenRate: m.openCount > 0 ? (m.clickCount / m.openCount) * 100 : 0,
    bounceRate: m.sentCount > 0 ? (m.bounceCount / m.sentCount) * 100 : 0,
    unsubscribeRate: m.deliveredCount > 0 ? (m.unsubscribeCount / m.deliveredCount) * 100 : 0,
    complaintRate: m.deliveredCount > 0 ? (m.complaintCount / m.deliveredCount) * 100 : 0
  };
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;