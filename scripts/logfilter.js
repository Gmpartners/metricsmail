const fs = require('fs');
const readline = require('readline');

// Função principal para filtrar os logs
async function filterLogs(inputFilePath, days = 1) {
  try {
    const fileStream = fs.createReadStream(inputFilePath);
    
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    // Objetos para rastrear eventos
    const events = {};
    const duplicates = [];
    let eventCount = 0;
    
    // Processar cada linha
    for await (const line of rl) {
      // Ignorar linhas que não contêm informações de eventos
      if (!line.includes('[EVENT') && !line.includes('Evento de abertura já registrado')) {
        continue;
      }
      
      // Extrair informações essenciais do evento
      if (line.includes('[EVENT')) {
        eventCount++;
        
        // Extrair tipo e dados do evento
        const eventTypeMatch = line.match(/\[EVENT ([^\]]+)\]/);
        if (!eventTypeMatch) continue;
        
        const eventType = eventTypeMatch[1];
        
        // Extrair IDs e timestamps do JSON (simplificado)
        const emailIdMatch = line.match(/"emailId":(\d+)/);
        const leadIdMatch = line.match(/"leadId":(\d+|"[^"]+")/); 
        const timestampMatch = line.match(/"timestamp":"([^"]+)"/);
        
        const emailId = emailIdMatch ? emailIdMatch[1] : 'unknown';
        const leadId = leadIdMatch ? leadIdMatch[1] : 'unknown';
        const timestamp = timestampMatch ? timestampMatch[1] : 'unknown';
        
        // Criar um identificador único para o evento
        const eventKey = `${eventType}-${emailId}-${leadId}-${timestamp}`;
        
        // Verificar se já vimos este evento
        if (events[eventKey]) {
          duplicates.push({
            eventType,
            emailId, 
            leadId,
            timestamp,
            count: events[eventKey] + 1
          });
          events[eventKey]++;
        } else {
          events[eventKey] = 1;
        }
      }
      
      // Capturar mensagens de duplicação explícita
      if (line.includes('Evento de abertura já registrado')) {
        const duplicateIdMatch = line.match(/registrado exatamente: (.+)/);
        if (duplicateIdMatch) {
          duplicates.push({
            eventType: 'Duplicação Explícita',
            duplicateId: duplicateIdMatch[1]
          });
        }
      }
    }
    
    // Mostrar resumo dos eventos encontrados
    console.log('\n===== RESUMO DE EVENTOS =====');
    console.log(`Total de eventos processados: ${eventCount}`);
    
    // Mostrar eventos por tipo
    const eventsByType = {};
    for (const key in events) {
      const eventType = key.split('-')[0];
      eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;
    }
    
    console.log('\n===== EVENTOS POR TIPO =====');
    for (const type in eventsByType) {
      console.log(`${type}: ${eventsByType[type]}`);
    }
    
    // Mostrar duplicações encontradas
    console.log('\n===== DUPLICAÇÕES ENCONTRADAS =====');
    if (duplicates.length === 0) {
      console.log('Nenhuma duplicação encontrada.');
    } else {
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. Tipo: ${dup.eventType}`);
        if (dup.eventType === 'Duplicação Explícita') {
          console.log(`   ID Duplicado: ${dup.duplicateId}`);
        } else {
          console.log(`   Email ID: ${dup.emailId}`);
          console.log(`   Lead ID: ${dup.leadId}`);
          console.log(`   Timestamp: ${dup.timestamp}`);
          console.log(`   Ocorrências: ${dup.count}`);
        }
        console.log('---');
      });
    }
    
  } catch (err) {
    console.error('Erro ao processar arquivo:', err);
  }
}

// Obter argumentos da linha de comando
const args = process.argv.slice(2);
const logFile = args[0] || '/root/metricsmail/server.log';

// Executar a função
console.log(`Analisando logs do arquivo: ${logFile}`);
filterLogs(logFile);
