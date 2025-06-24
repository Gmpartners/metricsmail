const mongoose = require('mongoose');
const { Event } = require('./index');

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
  // Email específico (opcional - para métricas por email)
  email: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
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
    uniqueOpenRate: {
      type: Number,
      default: 0
    },
    clickRate: {
      type: Number,
      default: 0
    },
    uniqueClickRate: {
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
  }
}, {
  timestamps: true
});

// Índices para consultas comuns
metricsSchema.index({ userId: 1, account: 1, date: -1 });
metricsSchema.index({ userId: 1, account: 1, email: 1, date: -1 });
metricsSchema.index({ userId: 1, period: 1, date: -1 });

// Função auxiliar para determinar os limites do período (início e fim)
const getPeriodBoundaries = (date, period) => {
  const periodStart = new Date(date);
  const periodEnd = new Date(date);
  
  // Configurar o início do período
  if (period === 'day') {
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    // Determinar o primeiro dia da semana (domingo)
    const day = periodStart.getDay();
    periodStart.setDate(periodStart.getDate() - day); // Voltar para o domingo
    periodStart.setHours(0, 0, 0, 0);
    
    // Determinar o último dia da semana (sábado)
    periodEnd.setDate(periodEnd.getDate() + (6 - day)); // Avançar para o sábado
    periodEnd.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    periodStart.setDate(1); // Primeiro dia do mês
    periodStart.setHours(0, 0, 0, 0);
    
    // Último dia do mês
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);
    periodEnd.setHours(23, 59, 59, 999);
  } else if (period === 'year') {
    periodStart.setMonth(0, 1); // 1º de janeiro
    periodStart.setHours(0, 0, 0, 0);
    
    periodEnd.setMonth(11, 31); // 31 de dezembro
    periodEnd.setHours(23, 59, 59, 999);
  }
  
  return { periodStart, periodEnd };
};

// Método estático para calcular e salvar métricas com base em eventos reais
metricsSchema.statics.calculateAndSave = async function(params) {
  const { userId, account, email, date, period } = params;
  
  if (!userId) {
    throw new Error('User ID é obrigatório para calcular métricas');
  }
  
  // Determinar período de início e fim para filtrar eventos
  const { periodStart, periodEnd } = getPeriodBoundaries(date, period);
  
  // Construir o filtro base para consultas
  const baseFilter = {
    userId,
    account,
    timestamp: { $gte: periodStart, $lte: periodEnd }
  };
  
  if (email) {
    baseFilter.email = email;
  }
  
  // ----- Contagem de Eventos -----
  
  // Contar todos os eventos (total)
  const totalEvents = await Event.countDocuments(baseFilter);
  
  // Contagem de envios
  const sentCount = await Event.countDocuments({
    ...baseFilter,
    eventType: 'send'
  });
  
  // ----- Aberturas (Totais e Únicas) -----
  
  // Contagem total de aberturas
  const openCount = await Event.countDocuments({
    ...baseFilter,
    eventType: 'open'
  });
  
  // Contagem de aberturas únicas
  const uniqueOpenCount = await Event.countDocuments({
    ...baseFilter,
    eventType: 'open',
    isFirstInteraction: true
  });
  
  // ----- Cliques (Totais e Únicos) -----
  
  // Contagem total de cliques
  const clickCount = await Event.countDocuments({
    ...baseFilter,
    eventType: 'click'
  });
  
  // Contagem de cliques únicos
  const uniqueClickCount = await Event.countDocuments({
    ...baseFilter,
    eventType: 'click',
    isFirstInteraction: true
  });
  
  // ----- Bounces (Devoluções) -----
  
  // Contagem de bounces
  const bounceCount = await Event.countDocuments({
    ...baseFilter,
    eventType: 'bounce'
  });
  
  // ----- Unsubscribes (Cancelamentos) -----
  
  // Contagem de unsubscribes
  const unsubscribeCount = await Event.countDocuments({
    ...baseFilter,
    eventType: 'unsubscribe'
  });
  
  // ----- Cálculo de Taxas -----
  
  // Calcular taxas com base nos contadores
  // Evitar divisão por zero para cada taxa
  
  // Taxa de abertura (todas as aberturas / emails enviados)
  const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
  
  // Taxa de abertura única (aberturas únicas / emails enviados)
  const uniqueOpenRate = sentCount > 0 ? (uniqueOpenCount / sentCount) * 100 : 0;
  
  // Taxa de clique (todos os cliques / emails enviados)
  const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
  
  // Taxa de clique único (cliques únicos / emails enviados)
  const uniqueClickRate = sentCount > 0 ? (uniqueClickCount / sentCount) * 100 : 0;
  
  // Taxa de clique por abertura (cliques únicos / aberturas únicas)
  const clickToOpenRate = uniqueOpenCount > 0 ? (uniqueClickCount / uniqueOpenCount) * 100 : 0;
  
  // Taxa de bounce (bounces / emails enviados)
  const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;
  
  // Taxa de unsubscribe (cancelamentos / emails enviados)
  const unsubscribeRate = sentCount > 0 ? (unsubscribeCount / sentCount) * 100 : 0;
  
  // Compilar todas as métricas calculadas
  const metrics = {
    totalEvents,
    sentCount,
    openCount,
    uniqueOpenCount,
    clickCount,
    uniqueClickCount,
    bounceCount,
    unsubscribeCount,
    openRate,
    uniqueOpenRate,
    clickRate,
    uniqueClickRate,
    clickToOpenRate,
    bounceRate,
    unsubscribeRate
  };
  
  // Preparar filtro para salvar as métricas
  const filter = {
    userId,
    account,
    period,
    date: periodStart // Usamos o início do período para a data de referência
  };
  
  if (email) {
    filter.email = email;
  }
  
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
