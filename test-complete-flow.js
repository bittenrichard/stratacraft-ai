fetch('https://ycrqmofaifxwrpcjjgmh.supabase.co/functions/v1/sync-campaigns', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcnFtb2ZhaWZ4d3JwY2pqZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MTIzOTUsImV4cCI6MjA0MTM4ODM5NX0.9dV9FpGt7oO9zJdJ5mE2wlpP9TQSHhQStNLO9fHc0To',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ debug: true })
})
.then(response => response.json())
.then(data => {
  console.log('📋 Resultado da sincronização:');
  console.log('   - Integrações encontradas:', data.debug?.integrations_found);
  console.log('   - Campanhas sincronizadas:', data.debug?.total_campaigns_synced);
  console.log('   - Última mensagem:', data.debug?.logs?.slice(-1)[0]);
  
  // Agora testar se conseguimos ler
  console.log('\n🔍 Testando leitura das campanhas...');
  
  return fetch('https://ycrqmofaifxwrpcjjgmh.supabase.co/rest/v1/campaigns?select=*', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcnFtb2ZhaWZ4d3JwY2pqZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MTIzOTUsImV4cCI6MjA0MTM4ODM5NX0.9dV9FpGt7oO9zJdJ5mE2wlpP9TQSHhQStNLO9fHc0To',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcnFtb2ZhaWZ4d3JwY2pqZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MTIzOTUsImV4cCI6MjA0MTM4ODM5NX0.9dV9FpGt7oO9zJdJ5mE2wlpP9TQSHhQStNLO9fHc0To'
    }
  });
})
.then(response => response.json())
.then(campaigns => {
  console.log('📊 Campanhas encontradas:', campaigns.length);
  if (campaigns.length > 0) {
    console.log('✅ Primeira campanha:', campaigns[0].name);
  } else {
    console.log('❌ Nenhuma campanha encontrada');
  }
})
.catch(error => {
  console.error('❌ Erro:', error);
});
