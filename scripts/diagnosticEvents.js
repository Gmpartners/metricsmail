/**
 * Script de diagnóstico para eventos
 * 
 * Este script analisa todos os eventos armazenados e verifica:
 * 1. Eventos duplicados (mesmo contactId, emailId e timestamp próximo)
 * 2. Problemas com as contagens e taxas
 * 3. Inconsistências nos dados
 */

require('dotenv').config({ path: '/root/metricsmail/.env' });
const mongoose = require('mongoose');
const Event = require('../src/models/eventModel');
const readline = require('readline');

// Conectar ao MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/metricsmail';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Obter userId como argumento de linha de comando
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('Por favor, forneça um userId como argumento');
      console.log('Uso: node diagnosticEvents.js <userId>');
      process.exit(1);
    }
    
    console.log(`Analisando eventos para o usuário: ${userId}`);
    
    // 1. Contagens básicas
    const totalEvents = await Event.countDocuments({ userId });
    const sendCount = await Event.countDocuments({ userId, eventType: 'send' });
    const openCount = await Event.countDocuments({ userId, eventType: 'open' });
    const clickCount = await Event.countDocuments({ userId, eventType: 'click' });
    
    console.log('\n=== CONTAGENS BÁSICAS ===');
    console.log(`Total de eventos: ${totalEvents}`);
    console.log(`Envios: ${sendCount}`);
    console.log(`Aberturas: ${openCount}`);
    console.log(`Cliques: ${clickCount}`);
    
    // 2. Verificar eventos de clique por metadados
    console.log('\n=== ANÁLISE DE EVENTOS DE CLIQUE ===');
    
    const pageHitEvents = await Event.countDocuments({ 
      userId, 
      eventType: 'click',
      'metadata.eventType': 'page_on_hit'
    });
    
    const emailClickEvents = await Event.countDocuments({ 
      userId, 
      eventType: 'click',
      'metadata.eventType': { $ne: 'page_on_hit' }
    });
    
    console.log(`Cliques de "page_on_hit": ${pageHitEvents}`);
    console.log(`Cliques de "email_on_click": ${emailClickEvents}`);
    console.log(`Total de cliques: ${pageHitEvents + emailClickEvents}`);
    
    // 3. Buscar aberturas e cliques únicos
    const uniqueOpens = await Event.countDocuments({ userId, eventType: 'open', isFirstInteraction: true });
    const uniqueClicks = await Event.countDocuments({ userId, eventType: 'click', isFirstInteraction: true });
    
    console.log('\n=== INTERAÇÕES ÚNICAS ===');
    console.log(`Aberturas únicas: ${uniqueOpens}`);
    console.log(`Cliques únicos: ${uniqueClicks}`);
    
    // 4. Calcular taxas
    console.log('\n=== TAXAS DE CONVERSÃO ===');
    const openRate = sendCount > 0 ? (openCount / sendCount) * 100 : 0;
    const clickRate = sendCount > 0 ? (clickCount / sendCount) * 100 : 0;
    const uniqueOpenRate = sendCount > 0 ? (uniqueOpens / sendCount) * 100 : 0;
    const uniqueClickRate = sendCount > 0 ? (uniqueClicks / sendCount) * 100 : 0;
    const ctr = openCount > 0 ? (clickCount / openCount) * 100 : 0;
    const uniqueCtr = uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0;
    
    console.log(`Taxa de abertura: ${openRate.toFixed(2)}%`);
    console.log(`Taxa de abertura única: ${uniqueOpenRate.toFixed(2)}%`);
    console.log(`Taxa de clique: ${clickRate.toFixed(2)}%`);
    console.log(`Taxa de clique única: ${uniqueClickRate.toFixed(2)}%`);
    console.log(`CTR: ${ctr.toFixed(2)}%`);
    console.log(`CTR único: ${uniqueCtr.toFixed(2)}%`);
    
    // 5. Verificar possíveis eventos duplicados
    console.log('\n=== VERIFICANDO EVENTOS POTENCIALMENTE DUPLICADOS ===');
    
    // 5.1 Encontrar eventos com o mesmo contactId, email e tipo no mesmo minuto
    const potentialDuplicates = await Event.aggregate([
      { $match: { userId } },
      { 
        $group: {
          _id: { 
            contactId: "$contactId", 
            email: "$email", 
            eventType: "$eventType",
            // Agrupar por minuto para encontrar eventos muito próximos
            minute: { 
              $dateToString: { 
                format: "%Y-%m-%d %H:%M", 
                date: "$timestamp" 
              } 
            }
          },
          count: { $sum: 1 },
          events: { $push: { id: "$_id", timestamp: "$timestamp" } }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    if (potentialDuplicates.length > 0) {
      console.log(`Encontrados ${potentialDuplicates.length} grupos de eventos potencialmente duplicados`);
      
      for (const group of potentialDuplicates.slice(0, 5)) { // Mostrar apenas os 5 primeiros grupos
        console.log(`\nGrupo: ${group._id.contactId} - ${group._id.eventType} - ${group._id.minute}`);
        console.log(`Total de eventos: ${group.count}`);
        
        // Buscar mais detalhes sobre estes eventos
        const eventIds = group.events.map(e => e.id);
        const events = await Event.find({ _id: { $in: eventIds } })
          .select('timestamp contactEmail url metadata.eventType externalId')
          .sort('timestamp');
        
        events.forEach((event, index) => {
          console.log(`  ${index+1}. ${event.timestamp.toISOString()} - ${event.contactEmail} - ${event.url || 'N/A'} - ${event.metadata?.eventType || 'N/A'}`);
        });
      }
      
      // Perguntar ao usuário se deseja corrigir eventos duplicados
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('\nDeseja limpar eventos duplicados? (s/n): ', async (answer) => {
        if (answer.toLowerCase() === 's') {
          console.log('\nIniciando limpeza de eventos duplicados...');
          
          let removed = 0;
          
          for (const group of potentialDuplicates) {
            // Manter apenas o primeiro evento de cada grupo
            const eventIds = group.events.map(e => e.id);
            const keepId = eventIds[0];
            const removeIds = eventIds.slice(1);
            
            if (removeIds.length > 0) {
              const result = await Event.deleteMany({ _id: { $in: removeIds } });
              removed += result.deletedCount;
            }
          }
          
          console.log(`\nLimpeza concluída! ${removed} eventos duplicados foram removidos.`);
          console.log('Execute o script novamente para verificar as novas métricas.');
        } else {
          console.log('\nLimpeza cancelada pelo usuário.');
        }
        
        rl.close();
        mongoose.connection.close();
        process.exit(0);
      });
    } else {
      console.log('Nenhum evento potencialmente duplicado encontrado.');
      mongoose.connection.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('Erro durante o diagnóstico:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}).catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});
