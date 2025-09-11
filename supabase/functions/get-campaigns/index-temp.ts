import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🔍 [GET-CAMPAIGNS] Iniciado')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials')
      throw new Error('Configuração do servidor incorreta')
    }

    console.log('✅ Credenciais OK')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    
    // Processar parâmetros
    let dateRange = {}
    try {
      const body = await req.json()
      dateRange = body.date_range || {}
    } catch (e) {
      console.log('⚠️ Body vazio, usando padrões')
    }
    
    const since = (dateRange as any).since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const until = (dateRange as any).until || new Date().toISOString().split('T')[0]
    
    console.log(`📅 Período: ${since} - ${until}`)

    // Por enquanto, retornar dados vazios mas com estrutura correta
    // Isso evita o erro 500 enquanto configuramos o banco
    
    console.log('📋 Retornando dados de exemplo temporário')
    
    const mockCampaigns = [
      {
        id: 'mock-1',
        external_id: 'test-123',
        name: 'Campanha de Teste',
        status: 'active',
        objective: 'CONVERSIONS',
        budget_amount: 50.00,
        budget_type: 'daily',
        start_date: new Date().toISOString(),
        end_date: null,
        insights: {
          data: [{
            spend: '245.50',
            impressions: '15430',
            clicks: '892',
            ctr: '5.78',
            cpc: '0.275',
            cpm: '15.91',
            reach: '12890',
            actions: []
          }]
        }
      }
    ]
    
    return new Response(
      JSON.stringify({
        success: true,
        campaigns: mockCampaigns,
        count: mockCampaigns.length,
        period: { since, until },
        message: 'Dados de exemplo - Configure as integrações Meta para dados reais'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erro:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno',
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
