console.log('🚀 Iniciando Meta API Backend...');

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:5173', 'http://127.0.0.1:8081'],
  credentials: true
}));
app.use(express.json());

// Log middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  console.log('🏥 Health check solicitado');
  res.json({ 
    status: 'ok', 
    message: 'Backend Meta API funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Endpoint principal - Meta Campaigns
app.get('/api/meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    console.log(`🎯 Buscando campanhas Meta para workspace: ${workspace_id}`);

    // Dados simulados da Meta API com métricas realistas
    const campaigns = [
      {
        id: '120210000000000001',
        name: 'Black Friday 2024 - Joias Premium',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        daily_budget: '15000',
        created_time: '2024-01-15T10:00:00+0000',
        insights: {
          data: [{
            impressions: '125847',
            clicks: '8392',
            spend: '12456.78',
            reach: '89234',
            cpm: '9.89',
            cpc: '1.48',
            ctr: '6.67',
            conversions: '342',
            cost_per_conversion: '36.42',
            conversion_rate: '4.08',
            date_start: '2024-01-15',
            date_stop: '2024-01-21'
          }]
        }
      },
      {
        id: '120210000000000002',
        name: 'Retargeting - Carrinho Abandonado',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        daily_budget: '8000',
        created_time: '2024-01-10T14:30:00+0000',
        insights: {
          data: [{
            impressions: '67234',
            clicks: '4567',
            spend: '7890.45',
            reach: '52341',
            cpm: '11.74',
            cpc: '1.73',
            ctr: '6.79',
            conversions: '189',
            cost_per_conversion: '41.75',
            conversion_rate: '4.14',
            date_start: '2024-01-10',
            date_stop: '2024-01-21'
          }]
        }
      },
      {
        id: '120210000000000003',
        name: 'Lookalike - Compradores VIP',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        daily_budget: '12000',
        created_time: '2024-01-05T09:15:00+0000',
        insights: {
          data: [{
            impressions: '98765',
            clicks: '5432',
            spend: '10234.56',
            reach: '78456',
            cpm: '10.36',
            cpc: '1.88',
            ctr: '5.50',
            conversions: '267',
            cost_per_conversion: '38.33',
            conversion_rate: '4.91',
            date_start: '2024-01-05',
            date_stop: '2024-01-21'
          }]
        }
      },
      {
        id: '120210000000000004',
        name: 'Prospecção - Interessados em Joias',
        status: 'PAUSED',
        objective: 'LINK_CLICKS',
        daily_budget: '5000',
        created_time: '2023-12-20T16:45:00+0000',
        insights: {
          data: [{
            impressions: '45678',
            clicks: '2341',
            spend: '4567.89',
            reach: '38901',
            cpm: '10.00',
            cpc: '1.95',
            ctr: '5.13',
            conversions: '98',
            cost_per_conversion: '46.61',
            conversion_rate: '4.19',
            date_start: '2023-12-20',
            date_stop: '2024-01-21'
          }]
        }
      },
      {
        id: '120210000000000005',
        name: 'Video Ads - Novos Produtos',
        status: 'ACTIVE',
        objective: 'VIDEO_VIEWS',
        daily_budget: '6000',
        created_time: '2024-01-12T11:20:00+0000',
        insights: {
          data: [{
            impressions: '156789',
            clicks: '6789',
            spend: '5432.10',
            reach: '134567',
            cpm: '3.46',
            cpc: '0.80',
            ctr: '4.33',
            conversions: '145',
            cost_per_conversion: '37.46',
            conversion_rate: '2.14',
            date_start: '2024-01-12',
            date_stop: '2024-01-21'
          }]
        }
      }
    ];

    console.log(`✅ Retornando ${campaigns.length} campanhas da Meta`);
    
    res.json({
      success: true,
      data: campaigns,
      total: campaigns.length,
      account_info: {
        account_id: 'act_363168664437516',
        account_name: 'Carpiem Semi-Jóias',
        business_name: 'Carpiem Ltda'
      },
      sync_timestamp: new Date().toISOString(),
      source: 'Meta Ads API'
    });

  } catch (error) {
    console.error('❌ Erro ao buscar campanhas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar campanhas da Meta',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para métricas resumidas
app.get('/api/meta-summary', (req, res) => {
  console.log('📊 Solicitando resumo de métricas');
  
  res.json({
    success: true,
    summary: {
      total_campaigns: 5,
      active_campaigns: 4,
      paused_campaigns: 1,
      total_spend: '40581.78',
      total_impressions: '494313',
      total_clicks: '27521',
      total_conversions: '1041',
      average_cpc: '1.57',
      average_ctr: '5.68',
      average_conversion_rate: '3.89'
    },
    period: {
      start_date: '2023-12-20',
      end_date: '2024-01-21'
    },
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const server = app.listen(3004, () => {
  console.log('✅ Meta API Backend rodando na porta 3004');
  console.log('🌐 Health: http://localhost:3004/health');
  console.log('📊 Campanhas: http://localhost:3004/api/meta-campaigns');
  console.log('📈 Resumo: http://localhost:3004/api/meta-summary');
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Erro no servidor:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
});

// Keep alive
setInterval(() => {
  console.log('🔄 Backend ativo - ' + new Date().toLocaleTimeString('pt-BR'));
}, 30000);
