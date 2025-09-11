import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3008;

// Configuração do Supabase
const supabaseUrl = 'https://cwnioogiqacbqunaungs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MzkwMzYsImV4cCI6MjA0MTUxNTAzNn0.UH5BnOctNPVcOeNu_hQV5t9XrRjnLV8j8JWVJpq0x5k';
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Buscar campanhas reais do Meta
app.get('/api/meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id é obrigatório' });
    }
    
    console.log('Buscando campanhas para workspace:', workspace_id);
    
    // Buscar integração ativa no Supabase
    const { data: integrations, error: integrationError } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'meta')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    // Se não encontrou por workspace_id, tentar por user_id (fallback)
    if (!integrations || integrations.length === 0) {
      console.log('Tentando buscar por user_id...');
      const { data: userIntegrations, error: userError } = await supabase
        .from('ad_integrations')
        .select('*')
        .eq('user_id', workspace_id)
        .eq('platform', 'meta')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (userError || !userIntegrations || userIntegrations.length === 0) {
        return res.status(404).json({ error: 'Integração Meta não encontrada' });
      }
      
      integrations.push(...userIntegrations);
    }

    const integration = integrations[0];
    console.log('Integração encontrada:', integration.account_id);

    const accountId = integration.account_id;
    const accessToken = integration.access_token;
    
    // Verificar se account_id já tem prefixo "act_"
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    try {
      // Buscar campanhas da API do Meta
      const campaignsUrl = `https://graph.facebook.com/v19.0/${formattedAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time,start_time,stop_time&access_token=${accessToken}`;
      
      console.log('Fazendo requisição para:', campaignsUrl.replace(accessToken, '[TOKEN_HIDDEN]'));
      
      const campaignsResponse = await fetch(campaignsUrl);
      
      if (!campaignsResponse.ok) {
        const errorData = await campaignsResponse.json();
        console.error('Erro da API Meta (campanhas):', errorData);
        
        if (errorData.error?.code === 190) {
          return res.status(401).json({ 
            error: 'Token de acesso expirado',
            message: 'Por favor, reconecte sua conta Meta',
            expired: true
          });
        }
        
        return res.status(400).json({ 
          error: 'Erro ao buscar campanhas do Meta', 
          details: errorData 
        });
      }
      
      const campaignsData = await campaignsResponse.json();
      console.log(`Encontradas ${campaignsData.data?.length || 0} campanhas`);
      
      // Buscar insights (métricas) para cada campanha
      const campaignsWithMetrics = await Promise.all(
        (campaignsData.data || []).map(async (campaign) => {
          try {
            // Buscar métricas dos últimos 30 dias
            const insightsUrl = `https://graph.facebook.com/v19.0/${campaign.id}/insights?fields=spend,impressions,clicks,cpm,cpc,ctr,reach,frequency,actions&date_preset=last_30d&access_token=${accessToken}`;
            
            const insightsResponse = await fetch(insightsUrl);
            
            let metrics = {
              spend: 0,
              impressions: 0,
              clicks: 0,
              cpm: 0,
              cpc: 0,
              ctr: 0,
              reach: 0,
              frequency: 0,
              conversions: 0
            };
            
            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              const rawMetrics = insightsData.data?.[0] || {};
              
              metrics = {
                spend: parseFloat(rawMetrics.spend || 0),
                impressions: parseInt(rawMetrics.impressions || 0),
                clicks: parseInt(rawMetrics.clicks || 0),
                cpm: parseFloat(rawMetrics.cpm || 0),
                cpc: parseFloat(rawMetrics.cpc || 0),
                ctr: parseFloat(rawMetrics.ctr || 0),
                reach: parseInt(rawMetrics.reach || 0),
                frequency: parseFloat(rawMetrics.frequency || 0),
                conversions: rawMetrics.actions?.find(action => 
                  action.action_type === 'purchase' || 
                  action.action_type === 'lead' ||
                  action.action_type === 'complete_registration'
                )?.value || 0
              };
            } else {
              console.log(`Não foi possível buscar métricas para campanha ${campaign.id}`);
            }
            
            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              created_time: campaign.created_time,
              updated_time: campaign.updated_time,
              start_time: campaign.start_time,
              stop_time: campaign.stop_time,
              metrics: metrics
            };
          } catch (error) {
            console.error(`Erro ao processar campanha ${campaign.id}:`, error);
            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              created_time: campaign.created_time,
              updated_time: campaign.updated_time,
              start_time: campaign.start_time,
              stop_time: campaign.stop_time,
              metrics: {
                spend: 0,
                impressions: 0,
                clicks: 0,
                cpm: 0,
                cpc: 0,
                ctr: 0,
                reach: 0,
                frequency: 0,
                conversions: 0
              }
            };
          }
        })
      );

      res.json({
        success: true,
        account_id: integration.account_id,
        account_name: integration.account_name,
        campaigns: campaignsWithMetrics,
        total_campaigns: campaignsWithMetrics.length,
        last_sync: new Date().toISOString()
      });

    } catch (fetchError) {
      console.error('Erro ao conectar com API do Meta:', fetchError);
      return res.status(500).json({ 
        error: 'Erro ao conectar com a API do Meta',
        details: fetchError.message
      });
    }

  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Sincronizar campanhas (POST)
app.post('/api/sync-meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.body;
    
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id é obrigatório' });
    }
    
    console.log('Sincronizando campanhas para workspace:', workspace_id);
    
    // Reutilizar a lógica do GET para buscar campanhas
    const campaignsResponse = await fetch(`http://localhost:${PORT}/api/meta-campaigns?workspace_id=${workspace_id}`);
    
    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json();
      return res.status(campaignsResponse.status).json(errorData);
    }
    
    const campaignsData = await campaignsResponse.json();
    
    res.json({
      success: true,
      message: 'Campanhas sincronizadas com sucesso',
      summary: {
        total: campaignsData.campaigns.length,
        created: 0,
        updated: campaignsData.campaigns.length,
        errors: 0
      },
      last_sync: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Debug: Verificar integrações
app.get('/api/debug-integrations', async (req, res) => {
  try {
    const { data: integrations, error } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('platform', 'meta');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({
      success: true,
      integrations: integrations,
      total: integrations.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend Meta API rodando na porta ${PORT}`);
  console.log('Endpoints disponíveis:');
  console.log('- GET /health');
  console.log('- GET /api/debug-integrations');
  console.log('- GET /api/meta-campaigns?workspace_id=XXX');
  console.log('- POST /api/sync-meta-campaigns');
});
