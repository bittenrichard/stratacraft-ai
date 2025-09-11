// Teste para verificar se as campanhas têm insights

async function testInsights() {
  try {
    const response = await fetch('https://cwnioogiqacbqunaungs.supabase.co/functions/v1/get-campaigns', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTkzMTQ4MywiZXhwIjoyMDQxNTA3NDgzfQ.BGZnKbVy3CnY7gLfJx-6K7k2gNzD2m8XrfGqOJrY2kE',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ Erro na resposta:', response.status, response.statusText);
      return;
    }

    const campaigns = await response.json();
    
    console.log('✅ Total de campanhas:', campaigns.length);
    
    if (campaigns.length > 0) {
      const firstCampaign = campaigns[0];
      console.log('\n📊 Primeira campanha:');
      console.log('Nome:', firstCampaign.name);
      console.log('Status:', firstCampaign.status);
      console.log('Platform:', firstCampaign.platform);
      
      if (firstCampaign.insights) {
        console.log('\n💰 Insights encontrados:');
        console.log('Spend:', firstCampaign.insights.spend);
        console.log('Impressions:', firstCampaign.insights.impressions);
        console.log('Clicks:', firstCampaign.insights.clicks);
        console.log('CTR:', firstCampaign.insights.ctr);
        console.log('CPC:', firstCampaign.insights.cpc);
        console.log('CPM:', firstCampaign.insights.cpm);
        console.log('Reach:', firstCampaign.insights.reach);
      } else {
        console.log('❌ Nenhum insight encontrado na campanha');
      }
      
      // Verifica algumas campanhas
      const campaignsWithInsights = campaigns.filter(c => c.insights && c.insights.spend);
      console.log(`\n📈 Campanhas com insights de spend: ${campaignsWithInsights.length}/${campaigns.length}`);
      
      if (campaignsWithInsights.length > 0) {
        console.log('\n💵 Valores de spend das primeiras 5 campanhas:');
        campaignsWithInsights.slice(0, 5).forEach(c => {
          console.log(`- ${c.name}: R$ ${c.insights.spend}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testInsights();
