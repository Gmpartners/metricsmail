const mongoose = require('mongoose');
require('dotenv').config();
const { Email } = require('../src/models');

const testSpaceSearch = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Atualizar um email para ter um nome com múltiplos espaços sem acentos
    const result = await Email.updateOne(
      { externalId: '1', userId: 'teste-certo' },
      { $set: { name: 'Meu Email de Teste com Espacos' } }
    );
    console.log('Email atualizado:', result);

    console.log('Atualização concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
};

testSpaceSearch();
