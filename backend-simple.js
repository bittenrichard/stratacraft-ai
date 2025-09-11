import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002; // Mudando para porta 3002

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:8082'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend funcionando!' });
});

// Endpoint simplificado para testar
app.get('/api/meta-campaigns', (req, res) => {
  const { workspace_id } = req.query;
  
  console.log('Recebido workspace_id:', workspace_id);
  
  res.json({
    success: true,
    message: 'Endpoint funcionando!',
    workspace_id: workspace_id,
    campaigns: [
      {
        id: 'test_1',
        name: 'Campanha de Teste 1',
        status: 'active',
        objective: 'TRAFFIC',
        metrics: {
          spend: 150.50,
          impressions: 12000,
          clicks: 450,
          ctr: 3.75,
          cpc: 0.33,
          cpm: 12.54,
          reach: 8500,
          frequency: 1.41,
          conversions: 12
        }
      },
      {
        id: 'test_2',
        name: 'Campanha de Teste 2',
        status: 'paused',
        objective: 'CONVERSIONS',
        metrics: {
          spend: 89.20,
          impressions: 7500,
          clicks: 230,
          ctr: 3.07,
          cpc: 0.39,
          cpm: 11.89,
          reach: 5200,
          frequency: 1.44,
          conversions: 8
        }
      }
    ],
    account_id: 'act_363168664437516',
    account_name: 'Conta 01 - Carpiem Semi-Jóias',
    total_campaigns: 2,
    last_sync: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend funcionando na porta ${PORT}`);
  console.log('Endpoints disponíveis:');
  console.log('- GET /health');
  console.log('- GET /api/meta-campaigns?workspace_id=XXX');
});
