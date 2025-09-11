import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3009;

// Configuração do CORS
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081'],
  credentials: true
}));

app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.query);
  next();
});

// Configuração do Supabase
const supabaseUrl = 'https://cwnioogiqacbqunaungs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzA4NjgsImV4cCI6MjA3MzA0Njg2OH0.rm6ahFHwS-p_ZXKb6vqwEqypv7Qe76ZR8uJps5M0moE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Endpoint de debug para verificar integrações
app.get('/api/debug-integrations', async (req, res) => {
  try {
    console.log('Buscando todas as integrações...');
    const { data, error } = await supabase
      .from('ad_integrations')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar integrações:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('Integrações encontradas:', data);
    res.json({ integrations: data });
  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para buscar campanhas do Meta
app.get('/api/meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    console.log('Buscando campanhas para workspace:', workspace_id);
    
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id é obrigatório' });
    }

    // Buscar integração Meta para este workspace
    const { data: integrations, error: integrationError } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'meta')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (integrationError) {
      console.error('Erro ao buscar integração:', integrationError);
      return res.status(500).json({ error: 'Erro ao buscar integração' });
    }

    if (!integrations || integrations.length === 0) {
      // Se não encontrou por workspace_id, tentar por user_id (fallback para compatibilidade)
      console.log('Tentando buscar integração por user_id como fallback...');
      
      const { data: integrationsFallback, error: integrationFallbackError } = await supabase
        .from('ad_integrations')
        .select('*')
        .eq('user_id', workspace_id) // Usar workspace_id como user_id
        .eq('platform', 'meta')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (integrationFallbackError || !integrationsFallback || integrationsFallback.length === 0) {
        return res.status(404).json({ error: 'Integração Meta não encontrada para este workspace' });
      }
      
      integrations = integrationsFallback;
    }

    const integration = integrations[0]; // Usar a mais recente
    console.log('Integração encontrada:', integration);

    // Buscar campanhas reais da API do Meta
    try {
      const accountId = integration.account_id;
      const accessToken = integration.access_token;
      
      console.log('Buscando campanhas do Meta para account:', accountId);
      
      // Verificar se o account_id já tem o prefixo "act_"
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
      
      // Buscar campanhas com campos básicos
      const campaignsUrl = `https://graph.facebook.com/v19.0/${formattedAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time,start_time,stop_time&access_token=${accessToken}`;
      
      const campaignsResponse = await fetch(campaignsUrl);
      
      if (!campaignsResponse.ok) {
        const errorData = await campaignsResponse.json();
        console.error('Erro da API Meta (campanhas):', errorData);
        
        // Se o token expirou, retornar erro específico
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
      console.log('Campanhas encontradas:', campaignsData.data?.length || 0);
      
      // Buscar insights (métricas) para cada campanha
      const campaignsWithMetrics = await Promise.all(
        (campaignsData.data || []).map(async (campaign) => {
          try {
            // Buscar métricas dos últimos 30 dias
            const insightsUrl = `https://graph.facebook.com/v19.0/${campaign.id}/insights?fields=spend,impressions,clicks,cpm,cpc,ctr,reach,frequency,actions&date_preset=last_30d&access_token=${accessToken}`;
            
            const insightsResponse = await fetch(insightsUrl);
            
            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              const metrics = insightsData.data?.[0] || {};
              
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
                  spend: parseFloat(metrics.spend || 0),
                  impressions: parseInt(metrics.impressions || 0),
                  clicks: parseInt(metrics.clicks || 0),
                  cpm: parseFloat(metrics.cpm || 0),
                  cpc: parseFloat(metrics.cpc || 0),
                  ctr: parseFloat(metrics.ctr || 0),
                  reach: parseInt(metrics.reach || 0),
                  frequency: parseFloat(metrics.frequency || 0),
                  conversions: metrics.actions?.find(action => action.action_type === 'purchase')?.value || 0
                }
              };
            } else {
              console.log(`Erro ao buscar métricas para campanha ${campaign.id}`);
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
      console.error('Erro ao buscar dados do Meta:', fetchError);
      return res.status(500).json({ 
        error: 'Erro ao conectar com a API do Meta',
        details: fetchError.message
      });
    }

  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para sincronizar campanhas (salvar no banco)
app.post('/api/sync-meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.body;
    
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id é obrigatório' });
    }
    
    console.log('Sincronizando campanhas para workspace:', workspace_id);
    
    // Buscar integração ativa
    const { data: integration, error: integrationError } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'meta')
      .eq('is_active', true)
      .limit(1)
      .order('created_at', { ascending: false });
    
    if (integrationError) {
      console.error('Erro ao buscar integração:', integrationError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    let integrations = integration;
    
    if (!integrations || integrations.length === 0) {
      // Se não encontrou por workspace_id, tentar por user_id (fallback para compatibilidade)
      console.log('Tentando buscar integração por user_id como fallback...');
      
      const { data: integrationsFallback, error: integrationFallbackError } = await supabase
        .from('ad_integrations')
        .select('*')
        .eq('user_id', workspace_id) // Usar workspace_id como user_id
        .eq('platform', 'meta')
        .eq('is_active', true)
        .limit(1)
        .order('created_at', { ascending: false });
      
      if (integrationFallbackError || !integrationsFallback || integrationsFallback.length === 0) {
        return res.status(404).json({ error: 'Integração Meta não encontrada' });
      }
      
      integrations = integrationsFallback;
    }
    
    const metaIntegration = integrations[0];
    const accountId = metaIntegration.account_id;
    const accessToken = metaIntegration.access_token;
    
    // Verificar se o account_id já tem o prefixo "act_"
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    // Buscar campanhas da API do Meta
    const campaignsUrl = `https://graph.facebook.com/v19.0/${formattedAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time,start_time,stop_time&access_token=${accessToken}`;
    const campaignsResponse = await fetch(campaignsUrl);
    
    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json();
      console.error('Erro da API Meta:', errorData);
      return res.status(400).json({ error: 'Erro ao buscar campanhas do Meta', details: errorData });
    }
    
    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.data || [];
    
    console.log(`Encontradas ${campaigns.length} campanhas para sincronizar`);
    
    // Processar cada campanha
    const syncResults = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          // Buscar métricas da campanha
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
              conversions: rawMetrics.actions?.find(action => action.action_type === 'purchase')?.value || 0
            };
          }
          
          // Salvar/atualizar campanha no banco
          const { data: existingCampaign } = await supabase
            .from('campaigns')
            .select('id')
            .eq('external_id', campaign.id)
            .eq('workspace_id', workspace_id)
            .single();
          
          const campaignData = {
            workspace_id: workspace_id,
            external_id: campaign.id,
            name: campaign.name,
            platform: 'meta',
            status: campaign.status.toLowerCase(),
            objective: campaign.objective,
            created_at: campaign.created_time,
            updated_at: campaign.updated_time,
            start_time: campaign.start_time,
            stop_time: campaign.stop_time,
            metrics: metrics,
            last_sync: new Date().toISOString()
          };
          
          if (existingCampaign) {
            // Atualizar campanha existente
            const { error: updateError } = await supabase
              .from('campaigns')
              .update(campaignData)
              .eq('id', existingCampaign.id);
            
            if (updateError) {
              console.error('Erro ao atualizar campanha:', updateError);
              return { campaign_id: campaign.id, status: 'error', error: updateError.message };
            }
            
            return { campaign_id: campaign.id, status: 'updated' };
          } else {
            // Criar nova campanha
            const { error: insertError } = await supabase
              .from('campaigns')
              .insert(campaignData);
            
            if (insertError) {
              console.error('Erro ao inserir campanha:', insertError);
              return { campaign_id: campaign.id, status: 'error', error: insertError.message };
            }
            
            return { campaign_id: campaign.id, status: 'created' };
          }
          
        } catch (error) {
          console.error(`Erro ao processar campanha ${campaign.id}:`, error);
          return { campaign_id: campaign.id, status: 'error', error: error.message };
        }
      })
    );
    
    const summary = {
      total: syncResults.length,
      created: syncResults.filter(r => r.status === 'created').length,
      updated: syncResults.filter(r => r.status === 'updated').length,
      errors: syncResults.filter(r => r.status === 'error').length
    };
    
    console.log('Sincronização concluída:', summary);
    
    res.json({
      success: true,
      message: 'Campanhas sincronizadas com sucesso',
      summary: summary,
      details: syncResults,
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

// Endpoint para trocar code por access token
app.post('/api/meta-exchange-token', async (req, res) => {
  try {
    const { code, redirect_uri, workspace_id } = req.body;
    console.log('Processando troca de token para workspace:', workspace_id);
    
    if (!code || !redirect_uri || !workspace_id) {
      return res.status(400).json({ error: 'Código, redirect_uri e workspace_id são obrigatórios' });
    }

    // Simular resposta de sucesso
    const mockResponse = {
      access_token: 'EAATest123456789',
      token_type: 'bearer',
      expires_in: 5184000,
      account_info: { 
        id: 'act_123456789', 
        name: 'Conta de Teste Meta' 
      }
    };

    console.log('Token exchange simulado com sucesso');
    res.json(mockResponse);

  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Endpoints disponíveis:');
  console.log('- GET /health');
  console.log('- GET /api/debug-integrations');
  console.log('- GET /api/meta-campaigns?workspace_id=XXX');
  console.log('- POST /api/sync-meta-campaigns');
  console.log('- POST /api/meta-exchange-token');
});
