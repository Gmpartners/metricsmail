const mongoose = require('mongoose');
require('dotenv').config();
const { Email } = require('../src/models');

const testCedilha = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Atualizar um email para ter cedilha e acentos
    const result = await Email.updateOne(
      { externalId: '1', userId: 'teste-certo' },
      { $set: { name: 'Promoção de Verão com Educação' } }
    );
    console.log('Email atualizado:', result);

    console.log('Atualização concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
};

testCedilha();
