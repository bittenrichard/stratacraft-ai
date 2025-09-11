import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  'https://ycrqmofaifxwrpcjjgmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcnFtb2ZhaWZ4d3JwY2pqZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MTIzOTUsImV4cCI6MjA0MTM4ODM5NX0.9dV9FpGt7oO9zJdJ5mE2wlpP9TQSHhQStNLO9fHc0To'
);

console.log('🔍 Testando acesso direto às campanhas...');

try {
  const { data, error, count } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact' });

  console.log('📊 Resultado:');
  console.log('   - Total:', count);
  console.log('   - Campanhas:', data?.length || 0);
  console.log('   - Erro:', error);
  
  if (data && data.length > 0) {
    console.log('✅ Primeiras campanhas encontradas:');
    data.slice(0, 3).forEach((campaign, index) => {
      console.log(`   ${index + 1}. ${campaign.name} (${campaign.status})`);
    });
  }
} catch (err) {
  console.error('❌ Erro na consulta:', err);
}
