require('dotenv').config();
const mongoose = require('mongoose');

async function testEventFields() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/metricsmail');
    console.log('Conectado ao MongoDB');
    
    // Buscar um evento para verificar a estrutura
    const db = mongoose.connection;
    const eventCollection = db.collection('events');
    
    const event = await eventCollection.findOne({ userId: 'wBnoxuKZfUUluhg8jwUtQBB3Jgo2' });
    
    if (event) {
      console.log('Campos do evento:');
      console.log(Object.keys(event));
      
      // Verificar campos específicos
      console.log('\nValores importantes:');
      console.log('userId:', event.userId);
      console.log('email (objeto):', event.email);
      console.log('emailId (string):', event.emailId);
      console.log('eventType:', event.eventType);
      console.log('timestamp:', event.timestamp);
    } else {
      console.log('Nenhum evento encontrado');
    }
    
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  } catch (error) {
    console.error('Erro:', error);
  }
}

testEventFields();
