const mongoose = require('mongoose');
require('dotenv').config();
const { Email } = require('../src/models');

const createTextIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Criar índice de texto para busca mais eficiente
    const result = await Email.collection.createIndex(
      { 
        name: 'text', 
        subject: 'text', 
        fromName: 'text' 
      }, 
      {
        default_language: 'portuguese',
        name: 'email_search_index'
      }
    );
    
    console.log('Índice de texto criado:', result);
    
    // Listar índices existentes
    const indexes = await Email.collection.indexes();
    console.log('Índices existentes:', indexes.map(i => i.name));

    console.log('Configuração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
};

createTextIndex();
