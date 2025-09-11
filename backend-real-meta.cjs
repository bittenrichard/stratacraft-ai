console.log('🚀 Iniciando Backend Meta API com Supabase...');

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

// Configuração do Supabase
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://cwnioogiqacbqunaungs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzA4NjgsImV4cCI6MjA3MzA0Njg2OH0.rm6ahFHwS-p_ZXKb6vqwEqypv7Qe76ZR8uJps5M0moE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Health check
app.get('/health', (req, res) => {
  console.log('🏥 Health check solicitado');
  res.json({ 
    status: 'ok', 
    message: 'Backend Meta API com Supabase funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Função para buscar credenciais da Meta no Supabase
async function getMetaCredentials(workspaceId) {
  try {
    console.log(`🔑 Buscando credenciais Meta para workspace: ${workspaceId}`);
    
    const { data, error } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'meta')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar credenciais:', error);
      return null;
    }

    if (!data) {
      console.log('⚠️ Nenhuma integração Meta encontrada');
      return null;
    }

    console.log(`✅ Credenciais encontradas para conta: ${data.account_name} (${data.account_id})`);
    return data;
    
  } catch (error) {
    console.error('❌ Erro ao acessar Supabase:', error);
    return null;
  }
}

// Função para fazer chamadas à Meta API
async function fetchMetaData(accessToken, accountId, endpoint) {
  try {
    const metaApiUrl = `https://graph.facebook.com/v19.0/${accountId}/${endpoint}`;
    
    console.log(`📱 Chamando Meta API: ${metaApiUrl}`);
    
    const response = await fetch(metaApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na Meta API:', errorData);
      
      if (response.status === 401) {
        throw new Error('Token expirado');
      }
      
      throw new Error(`Meta API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log(`✅ Dados recebidos da Meta API`);
    return data;
    
  } catch (error) {
    console.error('❌ Erro ao chamar Meta API:', error);
    throw error;
  }
}

// Endpoint principal - Meta Campaigns
app.get('/api/meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    console.log(`🎯 Solicitação de campanhas para workspace: ${workspace_id}`);

    if (!workspace_id) {
      return res.status(400).json({
        success: false,
        error: 'workspace_id é obrigatório'
      });
    }

    // Buscar credenciais da Meta no Supabase
    const credentials = await getMetaCredentials(workspace_id);
    
    if (!credentials) {
      return res.status(404).json({
        success: false,
        error: 'Integração com Meta não encontrada',
        message: 'Configure a integração com Meta Ads nas configurações',
        requires_setup: true
      });
    }

    // Verificar se o token não expirou
    if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        message: 'Reconecte sua conta Meta Ads nas configurações',
        expired: true
      });
    }

    try {
      // Buscar campanhas da Meta API
      const campaignsData = await fetchMetaData(
        credentials.access_token,
        credentials.account_id,
        'campaigns?fields=id,name,status,objective,daily_budget,created_time,insights.limit(1){impressions,clicks,spend,reach,cpm,cpc,ctr,conversions,cost_per_conversion}&limit=50'
      );

      console.log(`✅ ${campaignsData.data?.length || 0} campanhas encontradas na Meta API`);
      
      const campaigns = campaignsData.data || [];
      
      res.json({
        success: true,
        data: campaigns,
        total: campaigns.length,
        account_info: {
          account_id: credentials.account_id,
          account_name: credentials.account_name,
          business_name: credentials.account_name
        },
        sync_timestamp: new Date().toISOString(),
        source: 'Meta Ads API - Real Data'
      });

    } catch (apiError) {
      console.error('❌ Erro na Meta API:', apiError);
      
      if (apiError.message.includes('Token expirado')) {
        return res.status(401).json({
          success: false,
          error: 'Token expirado',
          message: 'Reconecte sua conta Meta Ads nas configurações',
          expired: true
        });
      }
      
      // Em caso de erro da API, retornar dados simulados
      console.log('📊 Retornando dados simulados devido a erro na API');
      
      const simulatedCampaigns = [
        {
          id: '120210000000000001',
          name: `Campanha Demo - ${credentials.account_name}`,
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
        }
      ];
      
      res.json({
        success: true,
        data: simulatedCampaigns,
        total: simulatedCampaigns.length,
        account_info: {
          account_id: credentials.account_id,
          account_name: credentials.account_name,
          business_name: credentials.account_name
        },
        sync_timestamp: new Date().toISOString(),
        source: 'Simulated Data (API Error)',
        api_error: apiError.message
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para listar todas as integrações
app.get('/api/integrations', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    
    const { data, error } = await supabase
      .from('ad_integrations')
      .select('id, platform, account_name, account_id, is_active, created_at')
      .eq('workspace_id', workspace_id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      total: data?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar integrações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar integrações',
      message: error.message
    });
  }
});

// Iniciar servidor
const server = app.listen(3007, () => {
  console.log('✅ Meta API Backend com Supabase rodando na porta 3007');
  console.log('🌐 Health: http://localhost:3007/health');
  console.log('📊 Campanhas: http://localhost:3007/api/meta-campaigns');
  console.log('🔗 Integrações: http://localhost:3007/api/integrations');
  console.log('💾 Supabase conectado');
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Erro no servidor:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
});

// Keep alive com status
setInterval(() => {
  console.log('🔄 Backend ativo - ' + new Date().toLocaleTimeString('pt-BR'));
}, 60000);
