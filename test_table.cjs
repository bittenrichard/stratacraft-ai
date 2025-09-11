const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configurar fetch global antes de importar supabase
if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

const supabaseUrl = 'https://cwnioogiqacbqunaungs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzA4NjgsImV4cCI6MjA3MzA0Njg2OH0.rm6ahFHwS-p_ZXKb6vqwEqypv7Qe76ZR8uJps5M0moE';

console.log('URL:', supabaseUrl);
console.log('Chave configurada:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function createTable() {
  try {
    console.log('\n=== Tentando criar a tabela ad_integrations ===');
    
    // Vamos tentar criar diretamente com SQL simples
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.ad_integrations (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id UUID NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'google-analytics')),
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        account_id TEXT,
        account_name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `;
    
    console.log('Tentando criar tabela...');
    
    // Como não temos acesso direto ao SQL, vamos primeiro verificar se a tabela existe
    const { data: existingData, error: existingError } = await supabase
      .from('ad_integrations')
      .select('id')
      .limit(1);
    
    if (existingError && existingError.code === '42P01') {
      console.log('Tabela não existe, precisa ser criada através do painel do Supabase');
      console.log('SQL para criar a tabela:');
      console.log(createTableSQL);
      return;
    }
    
    console.log('Tabela já existe! Verificando estrutura...');
    console.log('Dados existentes:', existingData);
    
    // Tentar inserir um registro de teste para verificar se funciona
    const testData = {
      workspace_id: 'eee0ae5f-4023-45b3-8383-2143699d12c7',
      platform: 'meta',
      access_token: 'test_token_' + Date.now(),
      account_id: 'test_account',
      account_name: 'Test Account',
      is_active: true,
      settings: { test: true }
    };
    
    console.log('Tentando inserir registro de teste...');
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

createTable();
