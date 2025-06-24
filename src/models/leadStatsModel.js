const mongoose = require('mongoose');

const leadStatsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String, 
    required: true
  },
  count: {
    type: Number,
    required: true,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Índice composto para buscas rápidas e garantir unicidade
leadStatsSchema.index({ userId: 1, accountId: 1, date: 1 }, { unique: true });

const LeadStats = mongoose.model('LeadStats', leadStatsSchema);
module.exports = LeadStats;
