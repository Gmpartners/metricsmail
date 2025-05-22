const mongoose = require('mongoose');
require('dotenv').config();
const { Email } = require('../src/models');

const updateEmailNames = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Atualizar email com ID 30 (Complete Your Registration)
    const result1 = await Email.updateOne(
      { externalId: '30', userId: 'teste-certo' },
      { $set: { name: '00-GP-21-ZA-7' } }
    );
    console.log('Email ID 30 atualizado:', result1);

    // Atualizar email com ID 1 (Teste) - assumindo um nome genérico
    const result2 = await Email.updateOne(
      { externalId: '1', userId: 'teste-certo' },
      { $set: { name: 'Email de Teste' } }
    );
    console.log('Email ID 1 atualizado:', result2);

    console.log('Atualização concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
};

updateEmailNames();
