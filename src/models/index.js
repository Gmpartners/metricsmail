// Exporta todos os modelos a partir deste arquivo
const Account = require('./accountModel');
const Email = require('./emailModel');
const Event = require('./eventModel');
const Metrics = require('./metricsModel');
const LeadStats = require('./leadStatsModel');

module.exports = {
  Account,
  Email,
  Event,
  Metrics,
  LeadStats
};
