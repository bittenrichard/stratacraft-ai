const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3003;

// Middleware básico
app.use(cors());
app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check simples
app.get('/health', (req, res) => {
  console.log('Health check chamado');
  res.json({ status: 'ok', message: 'Backend funcionando!', timestamp: new Date().toISOString() });
});

// Endpoint de campanhas simplificado para teste
app.get('/api/meta-campaigns', (req, res) => {
  const { workspace_id } = req.query;
  console.log('Campanhas solicitadas para workspace:', workspace_id);
  
  // Retornar dados de teste para verificar se está funcionando
  res.json({
    success: true,
    account_id: 'act_363168664437516',
    account_name: 'Conta 01 - Carpiem Semi-Jóias',
    campaigns: [
      {
        id: 'test_real_1',
        name: 'Teste - Backend Funcionando',
        status: 'active',
        objective: 'CONVERSIONS',
        created_time: new Date().toISOString(),
        metrics: {
          spend: 100.00,
          impressions: 5000,
          clicks: 150,
          cpm: 20.00,
          cpc: 0.67,
          ctr: 3.00,
          reach: 3500,
          frequency: 1.43,
          conversions: 5
        }
      }
    ],
    total_campaigns: 1,
    last_sync: new Date().toISOString(),
    message: 'Backend conectado e funcionando!'
  });
});

// Iniciar servidor
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Backend funcionando na porta ${PORT}`);
  console.log(`📡 Health check: http://127.0.0.1:${PORT}/health`);
  console.log(`📊 Campanhas: http://127.0.0.1:${PORT}/api/meta-campaigns`);
});

// Tratar erros
process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada:', promise, 'reason:', reason);
});
