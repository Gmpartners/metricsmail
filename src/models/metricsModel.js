const mongoose = require('mongoose');

// Esquema para métricas agregadas (diárias, mensais, etc.)
const metricsSchema = new mongoose.Schema({
  // Campo userId para identificar o proprietário das métricas
  userId: {
    type: String,
    required: [true, 'O ID do usuário é obrigatório'],
    index: true
  },
  // Chaves de identificação
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'A conta é obrigatória'],
    index: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    index: true
  },
  
  // Período de agregação
  date: {
    type: Date,
    required: [true, 'A data é obrigatória'],
    index: true
  },
  period: {
    type: String,
    enum: ['day', 'week', 'month', 'year'],
    default: 'day',
    required: [true, 'O período é obrigatório'],
    index: true
  },
  
  // Métricas agregadas
  metrics: {
    // Contadores
    totalEvents: {
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
    },
    
    // Taxas calculadas
    deliveryRate: {
      type: Number,
      default: 0
    },
    openRate: {
      type: Number,
      default: 0
    },
    clickRate: {
      type: Number,
      default: 0
    },
    clickToOpenRate: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    unsubscribeRate: {
      type: Number,
      default: 0
    },
    complaintRate: {
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

// Índices compostos para consultas comuns
metricsSchema.index({ userId: 1, account: 1, date: -1, period: 1 });
metricsSchema.index({ userId: 1, campaign: 1, date: -1, period: 1 });
metricsSchema.index({ userId: 1, account: 1, campaign: 1, date: -1, period: 1 });

// Índice único para evitar duplicações
metricsSchema.index(
  { userId: 1, account: 1, campaign: 1, date: 1, period: 1 },
  { unique: true, sparse: true }
);

// Método estático para calcular e salvar métricas
metricsSchema.statics.calculateAndSave = async function(params) {
  const { userId, account, campaign, date, period } = params;
  
  if (!userId) {
    throw new Error('User ID é obrigatório para calcular métricas');
  }
  
  // Aqui implementaremos a lógica para calcular as métricas
  // com base nos eventos. Por enquanto, é apenas um modelo básico.
  
  const filter = {
    userId,
    account,
    period
  };
  
  if (campaign) {
    filter.campaign = campaign;
  }
  
  // Definir data corretamente com base no período
  if (period === 'day') {
    filter.date = new Date(date);
    filter.date.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    filter.date = new Date(date);
    filter.date.setDate(1);
    filter.date.setHours(0, 0, 0, 0);
  } else if (period === 'year') {
    filter.date = new Date(date);
    filter.date.setMonth(0, 1);
    filter.date.setHours(0, 0, 0, 0);
  }
  
  // Simular alguns dados para fins de teste
  const metrics = {
    totalEvents: Math.floor(Math.random() * 1000),
    sentCount: Math.floor(Math.random() * 1000),
    deliveredCount: Math.floor(Math.random() * 900),
    openCount: Math.floor(Math.random() * 500),
    uniqueOpenCount: Math.floor(Math.random() * 300),
    clickCount: Math.floor(Math.random() * 200),
    uniqueClickCount: Math.floor(Math.random() * 150),
    bounceCount: Math.floor(Math.random() * 50),
    unsubscribeCount: Math.floor(Math.random() * 20),
    complaintCount: Math.floor(Math.random() * 10)
  };
  
  // Calcular taxas
  metrics.deliveryRate = metrics.sentCount > 0 ? (metrics.deliveredCount / metrics.sentCount) * 100 : 0;
  metrics.openRate = metrics.deliveredCount > 0 ? (metrics.uniqueOpenCount / metrics.deliveredCount) * 100 : 0;
  metrics.clickRate = metrics.deliveredCount > 0 ? (metrics.uniqueClickCount / metrics.deliveredCount) * 100 : 0;
  metrics.clickToOpenRate = metrics.uniqueOpenCount > 0 ? (metrics.uniqueClickCount / metrics.uniqueOpenCount) * 100 : 0;
  metrics.bounceRate = metrics.sentCount > 0 ? (metrics.bounceCount / metrics.sentCount) * 100 : 0;
  metrics.unsubscribeRate = metrics.deliveredCount > 0 ? (metrics.unsubscribeCount / metrics.deliveredCount) * 100 : 0;
  metrics.complaintRate = metrics.deliveredCount > 0 ? (metrics.complaintCount / metrics.deliveredCount) * 100 : 0;
  
  // Upsert (atualizar se existir, criar se não existir)
  const result = await this.findOneAndUpdate(
    filter,
    { $set: { metrics } },
    { new: true, upsert: true }
  );
  
  return result;
};

const Metrics = mongoose.model('Metrics', metricsSchema);

module.exports = Metrics;