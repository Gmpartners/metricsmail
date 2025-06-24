/**
 * Script para coletar estatísticas diárias de leads cadastrados no Mautic
 * Executa diariamente à meia-noite (UTC-3) para coletar dados do dia anterior
 */

require('dotenv').config({ path: __dirname + '/../../.env' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurar log para este script
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'leadStats.log');
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry);
  console.log(message);
};

// Função principal
async function collectLeads() {
  try {
    log('Iniciando coleta de estatísticas de leads');

    // Chamar o endpoint global - coletará para todas as contas ativas e conectadas
    const response = await axios({
      method: 'post',
      url: `http://localhost:3000/api/admin/lead-stats/collect-all`,
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });

    if (response.data && response.data.success) {
      const summary = response.data.data.summary;
      log(`Coleta concluída com sucesso. Processadas ${summary.total} contas: ${summary.success} com sucesso, ${summary.failed} com erro.`);
      
      // Mostrar totais por conta
      const results = response.data.data.results;
      results.forEach(result => {
        if (result.success) {
          log(`Conta ${result.accountName} (User: ${result.userId}): ${result.count} leads`);
        } else {
          log(`Erro na conta ${result.accountName} (User: ${result.userId}): ${result.error}`);
        }
      });
    } else {
      log(`Falha na coleta: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    log(`Erro durante a coleta: ${error.message}`);
    if (error.response) {
      log(`Detalhes da resposta: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Executar imediatamente
collectLeads().then(() => {
  log('Script finalizado');
  process.exit(0);
}).catch(error => {
  log(`Erro fatal: ${error.message}`);
  process.exit(1);
});
