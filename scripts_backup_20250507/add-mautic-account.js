// Script para adicionar uma conta Mautic e testar a conexão automaticamente
require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('../src/models/accountModel');

// Configurações da conta Mautic
const mauticAccount = {
  userId: "user123", // ID do usuário (deve ser substituído por um ID válido)
  name: "Megano ZA Mautic",
  provider: "mautic",
  url: "https://megano-za-mautic.svy9y0.easypanel.host",
  credentials: {
    username: "dash",
    password: "123456"
  }
};

// Função para conectar ao banco de dados
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conexão com MongoDB estabelecida');
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  }
};

// Função para adicionar a conta e testar a conexão
const addAndTestAccount = async () => {
  try {
    // Conectar ao banco de dados
    await connectDB();
    
    // Verificar se a conta já existe
    const existingAccount = await Account.findOne({
      userId: mauticAccount.userId,
      provider: mauticAccount.provider,
      url: mauticAccount.url
    });
    
    if (existingAccount) {
      console.log('Esta conta já existe. ID:', existingAccount._id);
      
      // Testar a conexão
      console.log('Testando conexão com conta existente...');
      const result = await existingAccount.testConnection();
      console.log('Resultado do teste:', result);
      
      if (result.success) {
        console.log('Webhook URL:', existingAccount.webhookUrl || result.webhookUrl);
      }
      
      await mongoose.disconnect();
      return;
    }
    
    // Criar nova conta
    console.log('Criando nova conta Mautic...');
    const newAccount = new Account(mauticAccount);
    await newAccount.save();
    console.log('Conta criada com sucesso. ID:', newAccount._id);
    
    // Testar a conexão
    console.log('Testando conexão...');
    const result = await newAccount.testConnection();
    console.log('Resultado do teste:', result);
    
    if (result.success) {
      // Atualizar a conta com as informações do webhook
      const updatedAccount = await Account.findById(newAccount._id);
      console.log('Webhook URL:', updatedAccount.webhookUrl || result.webhookUrl);
    }
    
    // Desconectar do banco de dados
    await mongoose.disconnect();
  } catch (err) {
    console.error('Erro:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Executar o script
addAndTestAccount();
