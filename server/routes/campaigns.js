const express = require('express');
const supabase = require('../supabase');
const fetch = require('node-fetch');

const router = express.Router();

// Buscar campanhas do Meta Ads
router.get('/meta-campaigns', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id é obrigatório' });
    }

    console.log('Buscando campanhas para workspace:', workspace_id);

    // Busca a integração ativa do Meta para este workspace
    const { data: integration, error: integrationError } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'meta')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('Integração não encontrada:', integrationError);
      return res.status(404).json({ error: 'Integração Meta não encontrada para este workspace' });
    }

    console.log('Integração encontrada:', integration.account_name);

    // Busca campanhas usando a API do Meta
    const accountId = integration.account_id;
    const accessToken = integration.access_token;
    
    if (!accountId || !accessToken) {
      return res.status(400).json({ error: 'Dados de integração incompletos' });
    }

    // Faz a requisição para a API do Meta
    const campaignsUrl = `https://graph.facebook.com/v19.0/act_${accountId}/campaigns?fields=id,name,status,objective,created_time,updated_time,start_time,stop_time&access_token=${accessToken}`;
    
    console.log('Fazendo requisição para Meta API...');
    const response = await fetch(campaignsUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro da API Meta:', errorData);
      return res.status(response.status).json({ 
        error: 'Erro ao buscar campanhas do Meta',
        details: errorData
      });
    }

    const campaignsData = await response.json();
    console.log(`Encontradas ${campaignsData.data?.length || 0} campanhas`);

    res.json({
      campaigns: campaignsData.data || [],
      account_info: {
        account_id: accountId,
        account_name: integration.account_name
      }
    });

  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Buscar insights/métricas de uma campanha específica
router.get('/meta-campaigns/:campaignId/insights', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { workspace_id } = req.query;
    
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id é obrigatório' });
    }

    // Busca a integração ativa do Meta para este workspace
    const { data: integration, error: integrationError } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('platform', 'meta')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return res.status(404).json({ error: 'Integração Meta não encontrada' });
    }

    const accessToken = integration.access_token;
    
    // Busca insights da campanha
    const insightsUrl = `https://graph.facebook.com/v19.0/${campaignId}/insights?fields=impressions,clicks,spend,cpm,cpc,ctr,reach&access_token=${accessToken}`;
    
    const response = await fetch(insightsUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: 'Erro ao buscar insights da campanha',
        details: errorData
      });
    }

    const insightsData = await response.json();

    res.json({
      insights: insightsData.data || [],
      campaign_id: campaignId
    });

  } catch (error) {
    console.error('Erro ao buscar insights:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

module.exports = router;
