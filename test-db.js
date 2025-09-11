import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cwnioogiqacbqunaungs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzA4NjgsImV4cCI6MjA3MzA0Njg2OH0.rm6ahFHwS-p_ZXKb6vqwEqypv7Qe76ZR8uJps5M0moE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDatabase() {
  try {
    console.log('🔍 Testando consulta na tabela campaigns...');
    
    // Teste 1: Verificar todas as campanhas
    const { data: allCampaigns, error: allError } = await supabase
      .from('campaigns')
      .select('*');
    
    console.log('📊 Total de campanhas na tabela:', allCampaigns?.length || 0);
    if (allError) console.error('❌ Erro na consulta geral:', allError);
    
    // Teste 2: Verificar campanhas Meta
    const { data: metaCampaigns, error: metaError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('platform', 'meta');
    
    console.log('📊 Campanhas Meta na tabela:', metaCampaigns?.length || 0);
    if (metaError) console.error('❌ Erro na consulta Meta:', metaError);
    
    // Teste 3: Mostrar algumas campanhas
    if (metaCampaigns && metaCampaigns.length > 0) {
      console.log('📋 Primeiras 3 campanhas Meta:');
      metaCampaigns.slice(0, 3).forEach((campaign, index) => {
        console.log(`${index + 1}. ${campaign.name} (${campaign.status}) - ID: ${campaign.id}`);
      });
    }
    
    // Teste 4: Verificar integração
    const { data: integrations, error: intError } = await supabase
      .from('ad_integrations')
      .select('*')
      .eq('platform', 'meta');
    
    console.log('🔗 Integrações Meta encontradas:', integrations?.length || 0);
    if (intError) console.error('❌ Erro na consulta de integrações:', intError);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testDatabase();
