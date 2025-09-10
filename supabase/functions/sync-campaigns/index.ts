import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'shared/cors.ts'; // <-- ESTA LINHA FOI ATUALIZADA

// Tipos para os dados que esperamos da API do Meta
interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'ADSET_PAUSED' | 'CAMPAIGN_PAUSED' | 'DISAPPROVED' | 'PREAPPROVED' | 'PENDING_REVIEW' | 'PENDING_BILLING_INFO' | 'IN_PROCESS' | 'WITH_ISSUES';
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

interface MetaInsights {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  roas?: { value: string }[];
  date_start: string;
  campaign_id: string; 
}

// Mapeamento dos status do Meta para os status do nosso sistema
function mapMetaStatus(status: MetaCampaign['status']): string {
  const activeStatus: MetaCampaign['status'][] = ['ACTIVE'];
  const pausedStatus: MetaCampaign['status'][] = ['PAUSED', 'ADSET_PAUSED', 'CAMPAIGN_PAUSED'];

  if (activeStatus.includes(status)) {
    return 'active';
  }
  if (pausedStatus.includes(status)) {
    return 'paused';
  }
  return 'archived'; // Trata outros status como 'arquivado'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: integrations, error: integrationsError } = await supabaseAdmin
      .from('ad_integrations')
      .select('id, user_id, access_token, account_id')
      .eq('platform', 'meta')
      .eq('is_active', true);

    if (integrationsError) throw integrationsError;

    console.log(`Found ${integrations.length} Meta integration(s) to sync.`);

    for (const integration of integrations) {
      const { id: integration_id, user_id, access_token, account_id } = integration;
      
      if (!access_token) {
        console.warn(`Integration ${integration_id} is missing an access_token. Skipping.`);
        continue;
      }

      const fields = 'name,status,objective,daily_budget,lifetime_budget,start_time,stop_time';
      const campaignsUrl = `https://graph.facebook.com/v19.0/act_${account_id}/campaigns?fields=${fields}&access_token=${access_token}`;
      
      const campaignsResponse = await fetch(campaignsUrl);
      if (!campaignsResponse.ok) {
        console.error(`Error fetching campaigns for account ${account_id}:`, await campaignsResponse.text());
        continue; // Pula para a próxima integração em caso de erro
      }
      const campaignsResult = await campaignsResponse.json();
      const metaCampaigns: MetaCampaign[] = campaignsResult.data || [];

      console.log(`Found ${metaCampaigns.length} campaigns for account ${account_id}.`);

      if (metaCampaigns.length === 0) continue;

      const campaignsToUpsert = metaCampaigns.map(c => ({
        user_id: user_id,
        integration_id: integration_id,
        external_id: c.id,
        name: c.name,
        status: mapMetaStatus(c.status),
        objective: c.objective,
        budget_amount: parseFloat(c.daily_budget || c.lifetime_budget || '0') / 100,
        budget_type: c.daily_budget ? 'daily' : 'lifetime',
        start_date: c.start_time ? new Date(c.start_time).toISOString() : null,
        end_date: c.stop_time ? new Date(c.stop_time).toISOString() : null,
        platform: 'meta',
      }));
      
      const { data: upsertedCampaigns, error: campaignsUpsertError } = await supabaseAdmin
        .from('campaigns')
        .upsert(campaignsToUpsert, { onConflict: 'integration_id, external_id' })
        .select('id, external_id');

      if (campaignsUpsertError) throw campaignsUpsertError;

      const campaignIds = metaCampaigns.map(c => c.id);
      const insightsFields = 'spend,impressions,clicks,ctr,cpc,roas,conversion_values';
      const datePreset = 'last_7d'; 
      const insightsUrl = `https://graph.facebook.com/v19.0/insights?level=campaign&fields=${insightsFields}&filter=[{'field':'campaign.id','operator':'IN','value':${JSON.stringify(campaignIds)}}]&date_preset=${datePreset}&time_increment=1&access_token=${access_token}`;

      const insightsResponse = await fetch(insightsUrl);
       if (!insightsResponse.ok) {
        console.error(`Error fetching insights for account ${account_id}:`, await insightsResponse.text());
        continue;
      }
      const insightsResult = await insightsResponse.json();
      const metaInsights: MetaInsights[] = insightsResult.data || [];
      
      console.log(`Found ${metaInsights.length} daily insights for campaigns.`);
      
      if (metaInsights.length === 0) continue;

      const metricsToUpsert = metaInsights.map(insight => {
        const campaign = upsertedCampaigns?.find(c => c.external_id === insight.campaign_id);
        if (!campaign) return null;

        return {
          campaign_id: campaign.id,
          date_key: insight.date_start,
          spend: parseFloat(insight.spend || '0'),
          impressions: parseInt(insight.impressions || '0', 10),
          clicks: parseInt(insight.clicks || '0', 10),
          ctr: parseFloat(insight.ctr || '0'),
          cpc: parseFloat(insight.cpc || '0'),
          roas: parseFloat(insight.roas?.[0]?.value || '0'),
          conversion_value: parseFloat((insight as any).conversion_values?.[0]?.value || '0')
        };
      }).filter((m): m is NonNullable<typeof m> => m !== null);

      if (metricsToUpsert.length > 0) {
        const { error: metricsUpsertError } = await supabaseAdmin
          .from('campaign_metrics')
          .upsert(metricsToUpsert, { onConflict: 'campaign_id, date_key' });

        if (metricsUpsertError) throw metricsUpsertError;
      }
    }

    return new Response(JSON.stringify({ message: 'Sync completed successfully!' }), {
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