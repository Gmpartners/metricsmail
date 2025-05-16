/**
 * Script para coletar estatísticas diárias de leads cadastrados no Mautic
 * Executa diariamente à meia-noite para coletar dados do dia anterior
 */

const mongoose = require('mongoose');
const { Account, LeadStats } = require('../src/models');
const logger = require('../src/utils/loggerUtil');
const cron = require('node-cron');
require('dotenv').config();

// Conectar ao MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info('Conectado ao MongoDB para coleta de estatísticas'))
  .catch(err => {
    logger.error(`Erro ao conectar ao MongoDB: ${err.message}`);
    process.exit(1);
  });

// Função para ajustar para fuso horário Brasil (UTC-3)
const getBrasilDate = (date) => {
  const d = new Date(date);
  d.setHours(d.getHours() - 3);
  return d;
};

// Função para formatar data como YYYY-MM-DD
const formatDate = (date) => {
  const d = getBrasilDate(date);
  return d.toISOString().split('T')[0];
};

// Função que coleta stats de leads para uma data específica
async function collectLeadStatsForDate(date) {
  const dateStr = formatDate(date);
  
  // Busca todas as contas ativas
  const accounts = await Account.find({ status: 'active' });
  
  logger.info(`Iniciando coleta de estatísticas de leads para ${dateStr} (${accounts.length} contas)`);
  
  for (const account of accounts) {
    try {
      // Formata datas para a API do Mautic (início e fim do dia)
      const startDate = `${dateStr} 00:00:00`;
      const endDate = `${dateStr} 23:59:59`;
      
      // Chama método para buscar leads do Mautic por data
      const result = await account.getMauticLeadsByDate(startDate, endDate);
      
      if (result.success) {
        // Salva ou atualiza a contagem no banco
        await LeadStats.findOneAndUpdate(
          { accountId: account._id.toString(), date: dateStr },
          { count: result.total, lastUpdated: new Date() },
          { upsert: true, new: true }
        );
        
        logger.info(`Conta ${account.name}: ${result.total} leads em ${dateStr}`);
      } else {
        logger.error(`Erro ao buscar leads para conta ${account.name}: ${result.message}`);
      }
    } catch (error) {
      logger.error(`Erro ao processar conta ${account.name}: ${error.message}`);
    }
  }
  
  logger.info(`Coleta de estatísticas de leads concluída para ${dateStr}`);
}

// Executar imediatamente para a data de ontem
async function runNow() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await collectLeadStatsForDate(yesterday);
    logger.info('Coleta inicial de estatísticas concluída');
  } catch (error) {
    logger.error(`Erro na execução da coleta inicial: ${error.message}`);
  }
}

// Configuração do job CRON (executa às 00:05 todos os dias)
cron.schedule('5 0 * * *', async () => {
  try {
    logger.info('Iniciando job programado para coleta de estatísticas de leads');
    
    // Coleta estatísticas para o dia anterior
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await collectLeadStatsForDate(yesterday);
    
    logger.info('Job de coleta de estatísticas concluído com sucesso');
  } catch (error) {
    logger.error(`Erro na execução do job de estatísticas: ${error.message}`);
  }
});

// Executar agora se for chamado diretamente
if (require.main === module) {
  runNow().then(() => {
    logger.info('Coleta inicial finalizada, job CRON configurado para execução diária às 00:05');
  });
}

// Exporta função para uso em outros scripts
module.exports = { collectLeadStatsForDate };

