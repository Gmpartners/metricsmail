require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/databaseConfig');
const routes = require('./routes/indexRoutes');

// Inicialização do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração CORS melhorada
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:4200',
      'https://metricsmail.web.app',
      'https://metricsmail.firebaseapp.com',
      'https://devdash-8b926.web.app',
      'https://devdash-8b926.firebaseapp.com',
      'https://metrics.devoltaaojogo.com'
    ];
    
    console.log('Origin recebida:', origin);
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Origin não permitida:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id']
};

// Aplicar CORS
app.use(cors(corsOptions));

// Middlewares básicos
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Conectar ao MongoDB
connectDB();

// Rota para a API
app.use('/api', routes);

// Rota raiz
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Email Marketing Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          ul { list-style-type: none; padding: 0; }
          li { margin-bottom: 10px; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .card { border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .api-key { background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; }
          .note { color: #d9534f; }
        </style>
      </head>
      <body>
        <h1>Email Marketing Dashboard API</h1>
        
        <div class="card">
          <h2>Autenticação</h2>
          <p>Todas as requisições à API precisam incluir uma API Key.</p>
          <p>API Key: <span class="api-key">MAaDylN2bs0Y01Ep66</span></p>
          <p>Adicione a API Key em um dos seguintes formatos:</p>
          <ul>
            <li>Header: <code>x-api-key: MAaDylN2bs0Y01Ep66</code></li>
            <li>Query parameter: <code>?apiKey=MAaDylN2bs0Y01Ep66</code></li>
          </ul>
          <p class="note">Nota: Por segurança, em um ambiente de produção real, não exponha a API Key publicamente!</p>
        </div>
        
        <div class="card">
          <h2>Demonstração</h2>
          <ul>
            <li><a href="/apresentacao.html">Dashboard de Demonstração</a></li>
          </ul>
        </div>
        
        <div class="card">
          <h2>API Endpoints</h2>
          <ul>
            <li><a href="/api">Documentação da API</a></li>
            <li>Contas: <code>/api/users/{userId}/accounts</code></li>
            <li>Métricas: <code>/api/users/{userId}/metrics</code></li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV}`);
  console.log('CORS configurado para localhost e produção');
  console.log('Origins permitidas:', corsOptions.origin.toString());
});

module.exports = app;
