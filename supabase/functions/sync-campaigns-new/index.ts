import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  insights?: {
    data: {
      spend?: string;
      impressions?: string;
      clicks?: string;
      ctr?: string;
      cpc?: string;
      cpm?: string;
      reach?: string;
      actions?: any[];
    }[];
  };
}

const mapMetaStatus = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'active';
    case 'paused':
      return 'paused';
    case 'deleted':
    case 'archived':
      return 'archived';
    default:
      return 'draft';
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Iniciando sincronização de campanhas Meta...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Processar parâmetros da requisição
    let body = {}
    try {
      body = await req.json()
    } catch (e) {
      console.log('⚠️ Não foi possível fazer parse do body, usando valores padrão')
    }

    const dateRange = (body as any).date_range || {}
    const since = dateRange.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const until = dateRange.until || new Date().toISOString().split('T')[0]

    console.log(`📅 Período de sincronização: ${since} até ${until}`)

    // Buscar integrações Meta ativas
    const { data: integrations, error: integrationsError } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('platform', 'meta')
      .eq('status', 'active')

    if (integrationsError) {
      console.error('❌ Erro ao buscar integrações:', integrationsError)
      throw new Error(`Erro ao buscar integrações: ${integrationsError.message}`)
    }

    if (!integrations || integrations.length === 0) {
      console.log('⚠️ Nenhuma integração Meta ativa encontrada')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma integração Meta ativa encontrada',
          synced_campaigns: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`🔍 Processando ${integrations.length} integração(ões) Meta`)

    let totalSyncedCampaigns = 0
    let syncResults = []

    for (const integration of integrations) {
      try {
        console.log(`🔄 Processando integração ${integration.id}...`)
        
        const { id: integration_id, access_token, account_id } = integration

        if (!access_token || !account_id) {
          console.warn(`⚠️ Integração ${integration_id} está faltando access_token ou account_id`)
          continue
        }

        // Formatar account_id com prefixo act_ se necessário
        const formattedAccountId = account_id.startsWith('act_') ? account_id : `act_${account_id}`

        // 1. Buscar campanhas da API Meta
        console.log(`📱 Buscando campanhas para conta ${formattedAccountId}`)
        
        const campaignFields = 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time'
        const campaignsUrl = `https://graph.facebook.com/v19.0/${formattedAccountId}/campaigns?fields=${campaignFields}&limit=50&access_token=${access_token}`
        
        const campaignsResponse = await fetch(campaignsUrl)
        
        if (!campaignsResponse.ok) {
          const errorData = await campaignsResponse.json()
          console.error(`❌ Erro da API Meta para conta ${formattedAccountId}:`, errorData)
          
          if (errorData.error?.code === 190) {
            console.warn(`🔑 Token expirado para integração ${integration_id}`)
            continue
          }
          
          throw new Error(`Erro da API Meta: ${errorData.error?.message || 'Erro desconhecido'}`)
        }

        const campaignsData = await campaignsResponse.json()
        const metaCampaigns: MetaCampaign[] = campaignsData.data || []

        console.log(`📋 Encontradas ${metaCampaigns.length} campanhas para conta ${formattedAccountId}`)

        if (metaCampaigns.length === 0) {
          console.log(`⚠️ Nenhuma campanha encontrada para conta ${formattedAccountId}`)
          continue
        }

        // 2. Buscar insights para cada campanha
        console.log(`📊 Buscando insights para campanhas no período ${since} até ${until}`)
        
        for (let i = 0; i < metaCampaigns.length; i++) {
          const campaign = metaCampaigns[i]
          try {
            const insightsFields = 'spend,impressions,clicks,ctr,cpc,cpm,reach,actions'
            const timeRange = JSON.stringify({ since, until })
            const insightsUrl = `https://graph.facebook.com/v19.0/${campaign.id}/insights?fields=${insightsFields}&time_range=${encodeURIComponent(timeRange)}&access_token=${access_token}`
            
            const insightsResponse = await fetch(insightsUrl)
            
            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json()
              if (insightsData.data && insightsData.data.length > 0) {
                metaCampaigns[i].insights = { data: insightsData.data }
              } else {
                metaCampaigns[i].insights = { data: [] }
              }
            } else {
              console.warn(`⚠️ Erro ao buscar insights para campanha ${campaign.id}`)
              metaCampaigns[i].insights = { data: [] }
            }
          } catch (error) {
            console.warn(`⚠️ Erro ao processar insights da campanha ${campaign.id}:`, error)
            metaCampaigns[i].insights = { data: [] }
          }
        }

        // 3. Salvar campanhas no banco
        console.log(`💾 Salvando ${metaCampaigns.length} campanhas no banco`)
        
        const campaignsToUpsert = metaCampaigns.map(c => ({
          integration_id: integration_id,
          external_id: c.id,
          name: c.name,
          platform: 'meta',
          status: mapMetaStatus(c.status),
          objective: c.objective || null,
          budget_amount: parseFloat(c.daily_budget || c.lifetime_budget || '0') / 100,
          budget_type: c.daily_budget ? 'daily' : 'lifetime',
          start_date: c.start_time ? new Date(c.start_time).toISOString() : null,
          end_date: c.stop_time ? new Date(c.stop_time).toISOString() : null,
        }))

        const { data: upsertedCampaigns, error: campaignsError } = await supabaseAdmin
          .from('campaigns')
          .upsert(campaignsToUpsert, { onConflict: 'integration_id, external_id' })
          .select('id, external_id')

        if (campaignsError) {
          console.error('❌ Erro ao salvar campanhas:', campaignsError)
          throw new Error(`Erro ao salvar campanhas: ${campaignsError.message}`)
        }

        console.log(`✅ Campanhas salvas: ${upsertedCampaigns?.length || 0}`)

        // 4. Salvar métricas das campanhas
        console.log(`📈 Salvando métricas das campanhas`)
        
        const metricsToUpsert = []
        
        for (const campaign of metaCampaigns) {
          const savedCampaign = upsertedCampaigns?.find(c => c.external_id === campaign.id)
          if (!savedCampaign || !campaign.insights?.data?.[0]) continue

          const insightData = campaign.insights.data[0]
          metricsToUpsert.push({
            campaign_id: savedCampaign.id,
            date_key: until,
            spend: parseFloat(insightData.spend || '0'),
            impressions: parseInt(insightData.impressions || '0', 10),
            clicks: parseInt(insightData.clicks || '0', 10),
            ctr: parseFloat(insightData.ctr || '0'),
            cpc: parseFloat(insightData.cpc || '0'),
            cpm: parseFloat(insightData.cpm || '0'),
            reach: parseInt(insightData.reach || '0', 10),
            actions: insightData.actions || []
          })
        }

        if (metricsToUpsert.length > 0) {
          const { error: metricsError } = await supabaseAdmin
            .from('campaign_metrics')
            .upsert(metricsToUpsert, { onConflict: 'campaign_id, date_key' })

          if (metricsError) {
            console.error('❌ Erro ao salvar métricas:', metricsError)
            console.warn('⚠️ Continuando sem salvar métricas...')
          } else {
            console.log(`✅ Métricas salvas: ${metricsToUpsert.length}`)
          }
        }

        totalSyncedCampaigns += metaCampaigns.length
        
        syncResults.push({
          integration_id,
          account_id: formattedAccountId,
          campaigns_synced: metaCampaigns.length,
          metrics_synced: metricsToUpsert.length
        })

      } catch (error) {
        console.error(`❌ Erro ao processar integração ${integration.id}:`, error)
        syncResults.push({
          integration_id: integration.id,
          error: error.message
        })
      }
    }

    console.log(`🎉 Sincronização concluída! Total de campanhas sincronizadas: ${totalSyncedCampaigns}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída com sucesso`,
        period: { since, until },
        total_campaigns_synced: totalSyncedCampaigns,
        integrations_processed: integrations.length,
        results: syncResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erro geral na sincronização:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Falha na sincronização de campanhas'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
