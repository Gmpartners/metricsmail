// Script para monitorar logs em tempo real e filtrar eventos duplicados

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Configuração
const CONFIG = {
  logFile: '/root/metricsmail/server.log',
  tailLines: 50,          // Número de linhas para mostrar inicialmente
  pollIntervalMs: 1000,   // Intervalo de verificação de novos logs
  showOnlyEvents: true,   // Mostrar apenas eventos, não outros logs
};

// Estado
const state = {
  lastPosition: 0,
  seenEvents: new Map(), // Para rastrear eventos duplicados
  eventCount: 0,
  duplicateCount: 0
};

// Função para ler novas linhas do arquivo de log
async function readNewLines() {
  try {
    const stats = await fs.promises.stat(CONFIG.logFile);
    
    // Se o arquivo foi truncado ou substituído
    if (stats.size < state.lastPosition) {
      state.lastPosition = 0;
    }
    
    if (stats.size <= state.lastPosition) {
      return; // Nenhum novo conteúdo
    }
    
    const stream = fs.createReadStream(CONFIG.logFile, {
      start: state.lastPosition,
      end: stats.size
    });
    
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      processLine(line);
    }
    
    state.lastPosition = stats.size;
  } catch (err) {
    console.error('Erro ao ler arquivo de log:', err);
  }
}

// Função para exibir as últimas N linhas do arquivo
async function tailFile(n) {
  try {
    const content = await fs.promises.readFile(CONFIG.logFile, 'utf8');
    const lines = content.split('\n');
    const lastLines = lines.slice(-n);
    
    console.log(`\n=== Últimas ${n} linhas do log ===`);
    lastLines.forEach(line => processLine(line, true));
    console.log(`\n=== Fim das últimas ${n} linhas ===\n`);
    
    // Atualizar a posição
    state.lastPosition = (await fs.promises.stat(CONFIG.logFile)).size;
  } catch (err) {
    console.error('Erro ao ler arquivo de log:', err);
  }
}

// Função para processar cada linha do log
function processLine(line, isTail = false) {
  // Ignorar linhas vazias
  if (!line.trim()) return;
  
  // Se configurado para mostrar apenas eventos
  if (CONFIG.showOnlyEvents && 
      !line.includes('[EVENT') && 
      !line.includes('Evento de abertura já registrado') &&
      !line.includes('mautic.')) {
    return;
  }
  
  // Extrair informações de eventos
  if (line.includes('[EVENT') || line.includes('mautic.')) {
    state.eventCount++;
    
    // Extrair identificadores do evento
    const eventTypeMatch = line.match(/\[EVENT ([^\]]+)\]/) || line.match(/mautic\.([^\s]+)/);
    if (!eventTypeMatch) return console.log(line);
    
    const eventType = eventTypeMatch[1];
    
    // Extrair IDs e timestamps
    const emailIdMatch = line.match(/"emailId":(\d+)/);
    const leadIdMatch = line.match(/"leadId":(\d+|"[^"]+")/);
    
    const emailId = emailIdMatch ? emailIdMatch[1] : 'unknown';
    const leadId = leadIdMatch ? leadIdMatch[1] : 'unknown';
    
    // Criar um identificador para o evento
    const eventKey = `${eventType}-${emailId}-${leadId}`;
    
    // Verificar se já vimos este evento
    if (state.seenEvents.has(eventKey)) {
      state.duplicateCount++;
      console.log(`[DUPLICADO] ${eventType} - Email: ${emailId}, Lead: ${leadId}`);
    } else {
      state.seenEvents.set(eventKey, new Date());
      // Limpar eventos antigos (mais de 1 hora)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const [key, timestamp] of state.seenEvents.entries()) {
        if (timestamp < oneHourAgo) {
          state.seenEvents.delete(key);
        }
      }
      
      console.log(`[EVENTO] ${eventType} - Email: ${emailId}, Lead: ${leadId}`);
    }
  } else if (line.includes('Evento de abertura já registrado')) {
    state.duplicateCount++;
    const match = line.match(/registrado exatamente: (.+)/);
    if (match) {
      console.log(`[DUPLICADO REGISTRADO] ${match[1]}`);
    } else {
      console.log(line);
    }
  } else {
    // Outros logs
    console.log(line);
  }
}

// Mostrar estatísticas
function showStats() {
  console.log(`\n=== Estatísticas de Eventos ===`);
  console.log(`Total de eventos: ${state.eventCount}`);
  console.log(`Duplicações detectadas: ${state.duplicateCount}`);
  console.log(`Eventos únicos: ${state.seenEvents.size}`);
  console.log(`===================\n`);
}

// Função principal
async function main() {
  console.log(`Monitorando arquivo de log: ${CONFIG.logFile}`);
  console.log(`Pressione Ctrl+C para sair`);
  
  // Mostrar as últimas N linhas primeiro
  await tailFile(CONFIG.tailLines);
  
  // Iniciar monitoramento contínuo
  setInterval(readNewLines, CONFIG.pollIntervalMs);
  
  // Mostrar estatísticas a cada minuto
  setInterval(showStats, 60 * 1000);
}

// Iniciar
main().catch(console.error);
