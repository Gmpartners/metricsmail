/**
 * Script simplificado para verificar eventos
 */

const mongoose = require('mongoose');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/metricsmail', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  // Definir modelo de evento inline para evitar dependências circulares
  const eventSchema = new mongoose.Schema({
    userId: String,
    eventType: String,
    timestamp: Date,
    contactEmail: String,
    isFirstInteraction: Boolean,
    metadata: mongoose.Schema.Types.Mixed,
    url: String
  });
  
  const Event = mongoose.model('Event', eventSchema);
  
  try {
    // Obter userId como argumento de linha de comando
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('Por favor, forneça um userId como argumento');
      console.log('Uso: node checkEvents.js <userId>');
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
      $or: [
        {'metadata.eventType': { $exists: false }},
        {'metadata.eventType': { $ne: 'page_on_hit' }}
      ]
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
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Erro durante o diagnóstico:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}).catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});
