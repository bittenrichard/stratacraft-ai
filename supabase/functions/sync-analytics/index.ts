import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'shared/cors.ts';
import { JWT } from 'https://esm.sh/google-auth-library@9';
import { BetaAnalyticsDataClient } from 'https://esm.sh/@google-analytics/data@4';

// A função principal
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Busca todas as integrações do tipo 'google-analytics'
    const { data: integrations, error: integrationsError } = await supabaseAdmin
      .from('ad_integrations')
      .select('id, user_id, settings')
      .eq('platform', 'google-analytics')
      .eq('is_active', true);

    if (integrationsError) throw integrationsError;
    console.log(`Found ${integrations.length} Google Analytics integration(s) to sync.`);

    for (const integration of integrations) {
      const { user_id, settings } = integration;
      const { property_id, client_email, private_key } = settings as any;

      if (!property_id || !client_email || !private_key) {
        console.warn(`Integration for user ${user_id} is missing GA settings. Skipping.`);
        continue;
      }
      
      // 2. Autentica na API do Google usando as credenciais da conta de serviço
      const auth = new JWT({
        email: client_email,
        key: private_key,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });

      const analyticsDataClient = new BetaAnalyticsDataClient({ auth });

      // 3. Busca os dados de visitantes dos últimos 7 dias
      const [response] = await analyticsDataClient.runReport({
        property: `properties/${property_id}`,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }], // 'sessions' é a métrica para "Visitantes" no GA4
        dimensions: [{ name: 'date' }],
      });

      if (!response.rows) {
        console.log(`No data found for property ${property_id}.`);
        continue;
      }

      // 4. Prepara os dados para salvar no Supabase
      const dataToUpsert = response.rows.map(row => {
        const dateStr = row.dimensionValues?.[0]?.value || '';
        // Converte a data do formato YYYYMMDD para YYYY-MM-DD
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        
        return {
          user_id: user_id,
          date_key: formattedDate,
          period_type: 'daily',
          visitors: parseInt(row.metricValues?.[0]?.value || '0', 10),
        };
      });

      if (dataToUpsert.length > 0) {
        // 5. Salva os dados na tabela funnel_data
        const { error: upsertError } = await supabaseAdmin
          .from('funnel_data')
          .upsert(dataToUpsert, { onConflict: 'user_id, date_key, period_type' });
        
        if (upsertError) throw upsertError;
        console.log(`Successfully upserted ${dataToUpsert.length} rows for property ${property_id}.`);
      }
    }

    return new Response(JSON.stringify({ message: 'GA Sync completed successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});