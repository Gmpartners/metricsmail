const mongoose = require('mongoose');

// Esquema para eventos de email marketing
const eventSchema = new mongoose.Schema({
  // Campo userId para identificar o proprietário do evento
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
  email: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
    required: [true, 'O email é obrigatório']
  },
  eventType: {
    type: String,
    required: [true, 'O tipo de evento é obrigatório'],
    enum: ['send', 'open', 'click', 'bounce', 'unsubscribe'],
    index: true
  },
  timestamp: {
    type: Date,
    required: [true, 'O timestamp é obrigatório'],
    index: true
  },
  contactEmail: {
    type: String,
    required: [true, 'O email do contato é obrigatório'],
    trim: true,
    lowercase: true,
    index: true
  },
  contactId: {
    type: String,
    required: [true, 'O ID do contato é obrigatório'],
    index: true
  },
  provider: {
    type: String,
    required: [true, 'O provedor é obrigatório'],
    enum: ['mautic', 'klaviyo', 'activecampaign', 'mailchimp']
  },
  externalId: {
    type: String,
    required: [true, 'O ID externo é obrigatório']
  },
  // Campo para indicar se é a primeira interação deste tipo para este contato/email
  isFirstInteraction: {
    type: Boolean,
    default: false,
    index: true
  },
  // Identificador único para esta combinação de contato-email-evento
  uniqueIdentifier: {
    type: String
    // Removido o index: true daqui para evitar duplicidade
  },
  // Campos específicos para diferentes tipos de eventos
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  url: {
    type: String,
    trim: true
  },
  urlId: {
    type: String
  },
  bounceType: {
    type: String,
    enum: ['hard', 'soft', null]
  },
  bounceReason: {
    type: String
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
eventSchema.index({ userId: 1, account: 1, eventType: 1, timestamp: -1 });
eventSchema.index({ userId: 1, email: 1, eventType: 1, timestamp: -1 });
eventSchema.index({ userId: 1, contactEmail: 1, eventType: 1, timestamp: -1 });
eventSchema.index({ userId: 1, externalId: 1 }, { unique: true });
// Índice para consultas de interações únicas
eventSchema.index({ email: 1, eventType: 1, isFirstInteraction: 1 });
eventSchema.index({ uniqueIdentifier: 1 }, { unique: true, sparse: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
