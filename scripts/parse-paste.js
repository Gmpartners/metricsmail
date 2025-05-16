// Script simples para analisar um arquivo colado e extrair eventos
const fs = require('fs');
const readline = require('readline');

async function parsePastedFile(filePath) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const events = [];
    let currentEvent = null;
    let eventStartLine = '';
    let inEventBlock = false;

    for await (const line of rl) {
      // Detectar início de um evento
      if (line.includes('[EVENT ') || line.includes('mautic.')) {
        // Se já estávamos em um bloco de evento, salvar o anterior
        if (currentEvent) {
          events.push(currentEvent);
        }
        
        // Iniciar novo evento
        inEventBlock = true;
        eventStartLine = line;
        
        // Extrair informações básicas
        const eventTypeMatch = line.match(/\[EVENT ([^\]]+)\]/) || line.match(/mautic\.([^\s]+)/);
        const eventType = eventTypeMatch ? eventTypeMatch[1] : 'unknown';
        
        currentEvent = { 
          type: eventType, 
          timestamp: line.match(/"timestamp":"([^"]+)"/) ? line.match(/"timestamp":"([^"]+)"/)[1] : 'unknown',
          emailId: line.match(/"emailId":(\d+)/) ? line.match(/"emailId":(\d+)/)[1] : 'unknown',
          leadId: line.match(/"leadId":(\d+|"[^"]+")/) ? line.match(/"leadId":(\d+|"[^"]+")/)[1] : 'unknown',
          raw: eventStartLine
        };
      }
      // Capturar eventos de duplicação
      else if (line.includes('Evento de abertura já registrado')) {
        events.push({
          type: 'DUPLICADO',
          details: line.match(/registrado exatamente: (.+)/) ? line.match(/registrado exatamente: (.+)/)[1] : line,
          raw: line
        });
      }
      // Capturar feedback após processamento
      else if (inEventBlock && currentEvent && (
        line.includes('processado com sucesso') || 
        line.includes('já registrado')
      )) {
        currentEvent.result = line;
        inEventBlock = false;
        events.push(currentEvent);
        currentEvent = null;
      }
    }

    // Adicionar último evento se não foi finalizado
    if (currentEvent) {
      events.push(currentEvent);
    }

    // Imprimir eventos extraídos de forma concisa
    console.log(`\n===== EVENTOS EXTRAÍDOS (${events.length}) =====\n`);
    
    events.forEach((event, index) => {
      if (event.type === 'DUPLICADO') {
        console.log(`${index + 1}. [DUPLICADO] ${event.details}`);
      } else {
        console.log(`${index + 1}. [${event.type}] Email ID: ${event.emailId}, Lead ID: ${event.leadId}, Timestamp: ${event.timestamp}`);
        if (event.result) {
          console.log(`   Resultado: ${event.result.trim()}`);
        }
      }
      console.log('---');
    });

    // Agrupar por tipo
    const eventsByType = {};
    events.forEach(event => {
      const type = event.type;
      eventsByType[type] = (eventsByType[type] || 0) + 1;
    });

    console.log('\n===== EVENTOS POR TIPO =====');
    for (const type in eventsByType) {
      console.log(`${type}: ${eventsByType[type]}`);
    }
    
    // Detectar possíveis duplicações
    const possibleDuplicates = new Map();
    events.forEach(event => {
      if (event.type === 'DUPLICADO') return;
      
      const key = `${event.type}-${event.emailId}-${event.leadId}`;
      if (possibleDuplicates.has(key)) {
        possibleDuplicates.get(key).count++;
      } else {
        possibleDuplicates.set(key, { 
          type: event.type, 
          emailId: event.emailId, 
          leadId: event.leadId, 
          count: 1 
        });
      }
    });

    // Exibir duplicações detectadas
    console.log('\n===== POSSÍVEIS DUPLICAÇÕES =====');
    let hasDuplicates = false;
    
    for (const [key, value] of possibleDuplicates.entries()) {
      if (value.count > 1) {
        hasDuplicates = true;
        console.log(`[${value.type}] Email ID: ${value.emailId}, Lead ID: ${value.leadId} - ${value.count} ocorrências`);
      }
    }
    
    if (!hasDuplicates) {
      console.log('Nenhuma duplicação de chave (tipo+emailId+leadId) detectada.');
    }

  } catch (err) {
    console.error('Erro ao processar arquivo:', err);
  }
}

// Obter o caminho do arquivo do argumento da linha de comando
const args = process.argv.slice(2);
const filePath = args[0] || '/root/paste.txt';

// Executar o parser
console.log(`Analisando o arquivo: ${filePath}`);
parsePastedFile(filePath);
