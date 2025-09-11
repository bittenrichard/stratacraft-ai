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
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzA4NjgsImV4cCI6MjA3MzA0Njg2OH0.rm6ahFHwS-p_ZXKb6vqwEqypv7Qe76ZR8uJps5M0moE';

async function testInsertion() {
  try {
    console.log('=== TESTE DE INSERÇÃO COM DIFERENTES ABORDAGENS ===');
    
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false }
    });
    
    // Teste 1: Inserção simples
    console.log('\n1. Testando inserção simples...');
    const testData1 = {
      workspace_id: 'eee0ae5f-4023-45b3-8383-2143699d12c7',
      platform: 'meta',
      access_token: 'test_token_simple',
      account_name: 'Test Account Simple',
      is_active: true
    };
    
    const { data: data1, error: error1 } = await supabase
      .from('ad_integrations')
      .insert([testData1])
      .select();
    
    if (error1) {
      console.log('❌ Erro simples:', error1);
    } else {
      console.log('✅ Inserção simples funcionou:', data1);
    }
    
    // Teste 2: Usar upsert
    console.log('\n2. Testando upsert...');
    const testData2 = {
      workspace_id: 'eee0ae5f-4023-45b3-8383-2143699d12c7',
      platform: 'meta',
      access_token: 'test_token_upsert',
      account_name: 'Test Account Upsert',
      is_active: true
    };
    
    const { data: data2, error: error2 } = await supabase
      .from('ad_integrations')
      .upsert(testData2)
      .select();
    
    if (error2) {
      console.log('❌ Erro upsert:', error2);
    } else {
      console.log('✅ Upsert funcionou:', data2);
    }
    
    // Teste 3: Verificar políticas existentes
    console.log('\n3. Verificando políticas...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'ad_integrations');
    
    if (policyError) {
      console.log('❌ Erro ao verificar políticas:', policyError);
    } else {
      console.log('📋 Políticas encontradas:', policies);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testInsertion();
