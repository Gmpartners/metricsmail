const mongoose = require('mongoose');
const { Event } = require('./src/models');
require('dotenv').config();

async function findUsersWithEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');
    
    // Encontrar usuários com mais eventos
    const users = await Event.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    console.log('Usuários com mais eventos:');
    users.forEach(user => {
      console.log(`- userId: ${user._id}, número de eventos: ${user.count}`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    mongoose.connection.close();
  }
}

findUsersWithEvents();
