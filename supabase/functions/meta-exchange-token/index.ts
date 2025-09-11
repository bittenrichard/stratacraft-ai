import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    console.log('=== Meta Exchange Token Function ===')
    
    const { code, redirect_uri, workspace_id, app_id, app_secret } = await req.json()

    console.log('Parâmetros recebidos:', {
      code: code ? 'presente' : 'ausente',
      redirect_uri,
      workspace_id: workspace_id ? 'presente' : 'ausente',
      app_id: app_id ? 'presente' : 'ausente',
      app_secret: app_secret ? 'presente' : 'ausente'
    })

    if (!code || !redirect_uri || !workspace_id || !app_id || !app_secret) {
      throw new Error('Parâmetros obrigatórios ausentes')
    }

    // Faz a requisição para o Meta para trocar o código pelo token
    const metaUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${app_id}` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&client_secret=${app_secret}` +
      `&code=${code}`

    console.log('Fazendo requisição para Meta API...')
    
    const metaResponse = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text()
      console.error('Erro na resposta do Meta:', metaResponse.status, errorText)
      throw new Error(`Meta API error: ${metaResponse.status} - ${errorText}`)
    }

    const tokenData = await metaResponse.json()
    console.log('Token recebido do Meta:', tokenData.access_token ? 'presente' : 'ausente')

    if (!tokenData.access_token) {
      throw new Error('Token não retornado pelo Meta')
    }

    // Buscar informações do usuário do Meta
    console.log('Buscando informações do usuário Meta...')
    const userInfoResponse = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${tokenData.access_token}&fields=id,name,email`
    )

    const userInfo = await userInfoResponse.json()
    console.log('Informações do usuário:', { id: userInfo.id, name: userInfo.name })

    // Buscar contas de anúncios
    console.log('Buscando contas de anúncios...')
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status,currency`
    )

    const adAccountsData = await adAccountsResponse.json()
    const adAccounts = adAccountsData.data || []
    console.log(`Encontradas ${adAccounts.length} contas de anúncios`)

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Salvando integração no banco...')

    // Salvar ou atualizar a integração na tabela ad_integrations
    const { data: integration, error: integrationError } = await supabase
      .from('ad_integrations')
      .upsert([
        {
          workspace_id,
          platform: 'meta',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          expires_at: tokenData.expires_in 
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          account_id: userInfo.id,
          account_name: userInfo.name,
          is_active: true,
          settings: {
            ad_accounts: adAccounts,
            token_type: tokenData.token_type || 'bearer',
            scope: tokenData.scope || null,
            platform_user_email: userInfo.email || null
          }
        }
      ], {
        onConflict: 'workspace_id,platform'
      })
      .select()

    if (integrationError) {
      console.error('Erro ao salvar integração:', integrationError)
      throw new Error(`Erro ao salvar integração: ${integrationError.message}`)
    }

    console.log('Integração salva com sucesso!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Integração Meta configurada com sucesso!',
        data: {
          platform_user_name: userInfo.name,
          ad_accounts_count: adAccounts.length,
          integration_id: integration?.[0]?.id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro na function meta-exchange-token:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Erro ao processar token do Meta'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
