const response = await fetch('https://ycrqmofaifxwrpcjjgmh.supabase.co/functions/v1/get-campaigns', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcnFtb2ZhaWZ4d3JwY2pqZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MTIzOTUsImV4cCI6MjA0MTM4ODM5NX0.9dV9FpGt7oO9zJdJ5mE2wlpP9TQSHhQStNLO9fHc0To',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ platform: 'meta' })
});

const data = await response.json();
console.log('📋 Resposta da função get-campaigns:');
console.log('   - Sucesso:', data.success);
console.log('   - Total de campanhas:', data.count);
console.log('   - Erro:', data.error);

if (data.campaigns && data.campaigns.length > 0) {
  console.log('✅ Primeiras 3 campanhas:');
  data.campaigns.slice(0, 3).forEach((campaign, index) => {
    console.log(`   ${index + 1}. ${campaign.name} (${campaign.status})`);
  });
} else {
  console.log('❌ Nenhuma campanha encontrada');
}
