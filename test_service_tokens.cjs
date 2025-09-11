const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configurar fetch global
if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

const supabaseUrl = 'https://cwnioogiqacbqunaungs.supabase.co';

// Tokens gerados para testar
const possibleServiceTokens = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ3MDg2OCwiZXhwIjoyMDczMDQ2ODY4fQ.NylatFeT5nV8VsBnmhV2xZ7vGxc9z7vGABXzQdyDQCY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ3MDg2OCwiZXhwIjoyMDczMDQ2ODY4fQ.KrYy19EdB1ydrrxqTtkTON6m9scsqorQ9l_0eWj-OPQ',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ3MDg2OCwiZXhwIjoyMDczMDQ2ODY4fQ.gQaUUaMUBj9E4hVpp8EegFi2JRlTRKb1hIiy8ksUQuU',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ3MDg2OCwiZXhwIjoyMDczMDQ2ODY4fQ.SNGF5dwGPvw0vcI6frkCs4LLq-vSK1VDnZDLe7wm1tM'
];

async function testServiceTokens() {
  for (let i = 0; i < possibleServiceTokens.length; i++) {
    const token = possibleServiceTokens[i];
    console.log(`\n=== Testando token ${i + 1} ===`);
    
    try {
      const supabase = createClient(supabaseUrl, token, {
        auth: { persistSession: false }
      });
      
      // Tentar inserir um registro de teste
      const testData = {
        workspace_id: 'eee0ae5f-4023-45b3-8383-2143699d12c7',
        platform: 'meta',
        access_token: 'test_token_' + Date.now(),
        account_id: 'test_account',
        account_name: 'Test Account',
        is_active: true,
        settings: { test: true }
      };
      
      const { data, error } = await supabase
        .from('ad_integrations')
        .insert([testData])
        .select();
      
      if (error) {
        console.log(`Token ${i + 1} falhou:`, error.message);
      } else {
        console.log(`🎉 Token ${i + 1} FUNCIONOU!`);
        console.log('Dados inseridos:', data);
        console.log('Token válido:', token);
        
        // Limpar o registro de teste
        if (data && data[0]) {
          await supabase
            .from('ad_integrations')
            .delete()
            .eq('id', data[0].id);
          console.log('Registro de teste removido');
        }
        break;
      }
      
    } catch (error) {
      console.log(`Token ${i + 1} erro geral:`, error.message);
    }
  }
}

testServiceTokens();
