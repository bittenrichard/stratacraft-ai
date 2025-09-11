const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

// Configurar fetch global
global.fetch = fetch;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('URL:', supabaseUrl);
console.log('Chave de serviço configurada:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    // Teste 1: Verificar se conseguimos listar tabelas
    console.log('\n=== TESTE 1: Verificando tabela ad_integrations ===');
    const { data, error } = await supabase
      .from('ad_integrations')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Erro ao consultar ad_integrations:', error);
    } else {
      console.log('Dados encontrados:', data);
      console.log('Total de registros encontrados:', data.length);
    }
    
    // Teste 2: Tentar inserir um registro de teste
    console.log('\n=== TESTE 2: Tentando inserir registro de teste ===');
    const testData = {
      workspace_id: 'eee0ae5f-4023-45b3-8383-2143699d12c7',
      platform: 'meta',
      access_token: 'test_token_' + Date.now(),
      account_id: 'test_account',
      account_name: 'Test Account',
      is_active: true,
      settings: { test: true }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('ad_integrations')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.error('Erro ao inserir:', insertError);
    } else {
      console.log('Inserção bem-sucedida:', insertData);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testConnection();
