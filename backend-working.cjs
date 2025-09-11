const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3003;

// Log de inicialização
console.log('🚀 Iniciando backend Meta API...');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  console.log('🏥 Health check');
  res.json({ 
    status: 'ok', 
    message: 'Backend funcionando!', 
    timestamp: new Date().toISOString() 
  });
});

// Endpoint para buscar campanhas da Meta
app.get('/api/meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    console.log(`🎯 Buscando campanhas para workspace: ${workspace_id}`);

    // Simulando dados reais da Meta API para teste
    const mockCampaigns = [
      {
        id: '120210000000000001',
        name: 'Campanha Black Friday - Carpiem',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        daily_budget: '5000',
        created_time: '2024-01-15T10:00:00+0000',
        insights: {
          data: [{
            impressions: '45234',
            clicks: '2156',
            spend: '4567.89',
            reach: '38921',
            cpm: '12.45',
            cpc: '2.12',
            ctr: '4.77',
            conversions: '89',
            cost_per_conversion: '51.31',
            conversion_rate: '4.13',
            date_start: '2024-01-15',
            date_stop: '2024-01-21'
          }]
        }
      },
      {
        id: '120210000000000002',
        name: 'Retargeting - Visitantes Site',
        status: 'ACTIVE',
        objective: 'LINK_CLICKS',
        daily_budget: '3000',
        created_time: '2024-01-10T14:30:00+0000',
        insights: {
          data: [{
            impressions: '32156',
            clicks: '1834',
            spend: '2890.45',
            reach: '28445',
            cpm: '8.99',
            cpc: '1.58',
            ctr: '5.71',
            conversions: '45',
            cost_per_conversion: '64.23',
            conversion_rate: '2.45',
            date_start: '2024-01-10',
            date_stop: '2024-01-21'
          }]
        }
      },
      {
        id: '120210000000000003',
        name: 'Lookalike - Compradores',
        status: 'PAUSED',
        objective: 'CONVERSIONS',
        daily_budget: '4000',
        created_time: '2024-01-05T09:15:00+0000',
        insights: {
          data: [{
            impressions: '28934',
            clicks: '1245',
            spend: '3456.78',
            reach: '25789',
            cpm: '11.94',
            cpc: '2.78',
            ctr: '4.30',
            conversions: '67',
            cost_per_conversion: '51.59',
            conversion_rate: '5.38',
            date_start: '2024-01-05',
            date_stop: '2024-01-21'
          }]
        }
      }
    ];

    console.log(`✅ Retornando ${mockCampaigns.length} campanhas`);
    
    res.json({
      success: true,
      data: mockCampaigns,
      total: mockCampaigns.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao buscar campanhas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar campanhas da Meta',
      message: error.message
    });
  }
});

// Endpoint para sincronizar dados (futuro)
app.post('/api/sync-meta-data', async (req, res) => {
  console.log('🔄 Iniciando sincronização Meta...');
  res.json({
    success: true,
    message: 'Sincronização iniciada',
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Servidor rodando em http://127.0.0.1:${PORT}`);
  console.log(`🌐 Health check: http://127.0.0.1:${PORT}/health`);
  console.log(`📊 Campanhas: http://127.0.0.1:${PORT}/api/meta-campaigns`);
});

// Log de erros
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});
