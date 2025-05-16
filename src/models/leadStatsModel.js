const mongoose = require('mongoose');

const leadStatsSchema = new mongoose.Schema({
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

leadStatsSchema.index({ accountId: 1, date: 1 }, { unique: true });

const LeadStats = mongoose.model('LeadStats', leadStatsSchema);
module.exports = LeadStats;
