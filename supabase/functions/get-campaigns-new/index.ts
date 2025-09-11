import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🔍 [GET-CAMPAIGNS] Função iniciada')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔑 [GET-CAMPAIGNS] Verificando credenciais...')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [GET-CAMPAIGNS] Missing Supabase credentials')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Configuração do servidor incorreta',
          campaigns: [],
          count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
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
      const requestText = await req.text()
      if (requestText) {
        body = JSON.parse(requestText)
      }
    } catch (e) {
      console.log('⚠️ [GET-CAMPAIGNS] Body vazio ou inválido, usando valores padrão')
    }
    
    const dateRange = (body as any).date_range || {}
    const since = dateRange.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const until = dateRange.until || new Date().toISOString().split('T')[0]
    
    console.log(`📅 [GET-CAMPAIGNS] Período: ${since} até ${until}`)
    
    // Buscar campanhas com tratamento robusto de erros
    console.log('🔍 [GET-CAMPAIGNS] Verificando tabelas...')
    
    let campaigns: any[] = []
    
    try {
      // Verificar se a tabela existe e buscar campanhas
      const { data: campaignsData, error: campaignsError } = await supabaseAdmin
        .from('campaigns')
        .select(`
          id,
          external_id,
          name,
          status,
          objective,
          budget_amount,
          budget_type,
          start_date,
          end_date,
          created_at,
          updated_at
        `)
        .eq('platform', 'meta')
        .order('created_at', { ascending: false })
        .limit(100)

      if (campaignsError) {
        console.error('❌ [GET-CAMPAIGNS] Erro ao buscar campanhas:', campaignsError)
        
        // Verificar se é erro de tabela não existir
        if (campaignsError.code === 'PGRST116' || 
            campaignsError.message?.includes('does not exist') ||
            campaignsError.message?.includes('relation') ||
            campaignsError.message?.includes('table')) {
          
          console.log('⚠️ [GET-CAMPAIGNS] Tabela campaigns não existe')
          return new Response(
            JSON.stringify({
              success: true,
              campaigns: [],
              count: 0,
              message: 'Sistema ainda não configurado. Execute a sincronização primeiro.',
              debug: { table_missing: true }
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          )
        }
        
        // Outros erros de acesso
        throw new Error(`Erro no banco: ${campaignsError.message}`)
      }

      campaigns = campaignsData || []
      console.log(`📋 [GET-CAMPAIGNS] ${campaigns.length} campanhas encontradas`)
      
    } catch (dbError) {
      console.error('❌ [GET-CAMPAIGNS] Erro de banco:', dbError)
      
      // Retornar resposta amigável para problemas de banco
      return new Response(
        JSON.stringify({
          success: true,
          campaigns: [],
          count: 0,
          message: 'Nenhuma campanha encontrada. Execute a sincronização primeiro.',
          debug: { database_error: true, error: dbError.message }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    if (campaigns.length === 0) {
      console.log('📭 [GET-CAMPAIGNS] Nenhuma campanha encontrada')
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

    // Buscar métricas com tratamento de erro
    console.log('📊 [GET-CAMPAIGNS] Buscando métricas...')
    const campaignIds = campaigns.map(c => c.id)
    
    let metrics: any[] = []
    try {
      const { data: metricsData, error: metricsError } = await supabaseAdmin
        .from('campaign_metrics')
        .select(`
          campaign_id,
          date_key,
          spend,
          impressions,
          clicks,
          ctr,
          cpc,
          cpm,
          reach,
          actions
        `)
        .in('campaign_id', campaignIds)
        .gte('date_key', since)
        .lte('date_key', until)
        .order('date_key', { ascending: false })

      if (metricsError) {
        console.warn('⚠️ [GET-CAMPAIGNS] Erro ao buscar métricas:', metricsError.message)
        metrics = []
      } else {
        metrics = metricsData || []
      }
    } catch (metricsErr) {
      console.warn('⚠️ [GET-CAMPAIGNS] Tabela de métricas não disponível:', metricsErr)
      metrics = []
    }

    console.log(`📊 [GET-CAMPAIGNS] ${metrics.length} métricas encontradas`)

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

    console.log(`✅ [GET-CAMPAIGNS] Retornando ${campaignsWithInsights.length} campanhas`)
    
    return new Response(
      JSON.stringify({
        success: true,
        campaigns: campaignsWithInsights,
        count: campaignsWithInsights.length,
        period: { since, until },
        message: `${campaignsWithInsights.length} campanhas encontradas`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ [GET-CAMPAIGNS] Erro crítico:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor',
        campaigns: [],
        count: 0,
        debug: {
          error_type: error.constructor.name,
          error_code: error.code || 'UNKNOWN',
          error_details: error.details || 'No details available',
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
