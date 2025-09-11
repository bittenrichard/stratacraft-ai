import { createClient } from '@supabase/supabase-js';

// Cliente Admin com service_role (pode ver tudo)
const supabaseAdmin = createClient(
  'https://ycrqmofaifxwrpcjjgmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcnFtb2ZhaWZ4d3JwY2pqZ21oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTgxMjM5NSwiZXhwIjoyMDQxMzg4Mzk1fQ.sOyJz7PTGsxq4CDbJ9c7m-kqBa6WnoWsWwJO7HDjVxY'
);

// Cliente normal com anon key (o que o frontend usa)
const supabaseClient = createClient(
  'https://ycrqmofaifxwrpcjjgmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcnFtb2ZhaWZ4d3JwY2pqZ21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MTIzOTUsImV4cCI6MjA0MTM4ODM5NX0.9dV9FpGt7oO9zJdJ5mE2wlpP9TQSHhQStNLO9fHc0To'
);

async function testRLS() {
  try {
    console.log('🔍 Testando acessos ao banco...\n');

    // Test 1: Com service_role (admin)
    const { data: adminCampaigns, error: adminError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .limit(5);

    console.log('📊 [ADMIN] Total de campanhas:', adminCampaigns?.length || 0);
    if (adminError) {
      console.error('❌ [ADMIN] Erro:', adminError);
    } else {
      console.log('✅ [ADMIN] Sucesso! Primeiras campanhas:');
      adminCampaigns?.slice(0, 2).forEach(c => {
        console.log(`   - ${c.name} (${c.status})`);
      });
    }

    console.log('');

    // Test 2: Com anon key (frontend)
    const { data: anonCampaigns, error: anonError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .limit(5);

    console.log('📊 [ANON] Total de campanhas:', anonCampaigns?.length || 0);
    if (anonError) {
      console.error('❌ [ANON] Erro:', anonError);
    } else {
      console.log('✅ [ANON] Sucesso! Primeiras campanhas:');
      anonCampaigns?.slice(0, 2).forEach(c => {
        console.log(`   - ${c.name} (${c.status})`);
      });
    }

    console.log('');
    
    // Test 3: Verificar RLS
    try {
      const { data: rlsStatus } = await supabaseAdmin
        .rpc('sql', { 
          query: "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'campaigns';" 
        });
      
      console.log('📋 Status RLS da tabela campaigns:', rlsStatus);
    } catch (err) {
      console.log('⚠️ Não foi possível verificar RLS via RPC');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testRLS();
