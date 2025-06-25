const express = require('express');
const app = express();
const cors = require('cors');

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
      'https://metrics.devoltaaojogo.com'
    ];
    
    // Permitir requisições sem origin (ex: Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
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

// Middleware para garantir headers CORS em todas as respostas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:4200',
    'https://metricsmail.web.app',
    'https://metricsmail.firebaseapp.com',
    'https://metrics.devoltaaojogo.com'
  ];
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

module.exports = corsOptions;
