import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Iniciando busca de campanhas...')
    
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
    
    console.log(`� Período solicitado: ${since} até ${until}`)
    
    // Buscar campanhas Meta
    console.log('🔍 Buscando campanhas Meta...')
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('platform', 'meta')
      .order('created_at', { ascending: false })
      .limit(100)

    if (campaignsError) {
      console.error('❌ Erro ao buscar campanhas:', campaignsError)
      throw new Error(`Erro ao buscar campanhas: ${campaignsError.message}`)
    }

    console.log(`📋 ${campaigns?.length || 0} campanhas encontradas`)

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          campaigns: [],
          count: 0,
          message: 'Nenhuma campanha Meta encontrada'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Buscar métricas
    console.log('📊 Buscando métricas...')
    const campaignIds = campaigns.map(c => c.id)
    
    let metrics: any[] = []
    try {
      const { data: metricsData, error: metricsError } = await supabaseAdmin
        .from('campaign_metrics')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('date_key', since)
        .lte('date_key', until)
        .order('date_key', { ascending: false })

      if (metricsError) {
        console.warn('⚠️ Erro ao buscar métricas:', metricsError.message)
        metrics = []
      } else {
        metrics = metricsData || []
      }
    } catch (metricsErr) {
      console.warn('⚠️ Tabela de métricas pode não existir:', metricsErr)
      metrics = []
    }

    console.log(`📊 ${metrics.length} métricas encontradas`)

    // Combinar campanhas com métricas
    const campaignsWithInsights = campaigns.map(campaign => {
      // Encontrar métricas desta campanha
      const campaignMetrics = metrics.filter(metric => 
        metric.campaign_id === campaign.id
      )
      
      // Usar a métrica mais recente
      const latestMetrics = campaignMetrics[0]
      
      return {
        ...campaign,
        insights: {
          data: [{
            spend: latestMetrics?.spend?.toString() || '0',
            impressions: latestMetrics?.impressions?.toString() || '0',
            clicks: latestMetrics?.clicks?.toString() || '0',
            ctr: latestMetrics?.ctr?.toString() || '0',
            cpc: latestMetrics?.cpc?.toString() || '0',
            cpm: latestMetrics?.cpm?.toString() || '0',
            reach: latestMetrics?.reach?.toString() || '0',
            actions: latestMetrics?.actions || []
          }]
        }
      }
    })

    console.log(`✅ Retornando ${campaignsWithInsights.length} campanhas processadas`)
    
    return new Response(
      JSON.stringify({
        success: true,
        campaigns: campaignsWithInsights,
        count: campaignsWithInsights.length,
        period: { since, until }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor',
        campaigns: [],
        count: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
