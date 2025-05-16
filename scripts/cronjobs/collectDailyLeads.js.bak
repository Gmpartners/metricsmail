/**
 * Script para coletar estatísticas diárias de leads cadastrados no Mautic
 * Executa diariamente à meia-noite (UTC-3) para coletar dados do dia anterior
 */

require('dotenv').config({ path: __dirname + '/../../.env' });
const mongoose = require('mongoose');
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

// Função para ajustar para UTC-3 (Brasil)
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

// Função principal
async function collectLeads() {
  try {
    log('Iniciando coleta de estatísticas de leads');

    // Calcular data de ontem (UTC-3)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatDate(yesterday);
    
    log(`Coletando estatísticas para a data: ${dateStr}`);

    // Chamar o endpoint interno do próprio sistema
    const response = await axios({
      method: 'post',
      url: `http://localhost:3000/api/lead-stats/collect-yesterday`,
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });

    if (response.data && response.data.success) {
      log(`Coleta concluída com sucesso. Processadas ${response.data.data.results.length} contas.`);
      
      // Mostrar totais por conta
      const results = response.data.data.results;
      results.forEach(result => {
        if (result.success) {
          log(`Conta ${result.accountName}: ${result.count} leads`);
        } else {
          log(`Erro na conta ${result.accountName}: ${result.error}`);
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
