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

async function disableRLS() {
  try {
    console.log('Tentando desabilitar RLS para ad_integrations...');
    
    // Usar a API REST do Supabase para executar SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
      },
      body: JSON.stringify({
        query: 'ALTER TABLE public.ad_integrations DISABLE ROW LEVEL SECURITY;'
      })
    });
    
    console.log('Status da resposta:', response.status);
    const result = await response.text();
    console.log('Resultado:', result);
    
    if (response.ok) {
      console.log('✅ RLS desabilitado com sucesso!');
    } else {
      console.log('❌ Falhou em desabilitar RLS via API');
      
      // Método alternativo: Tentar via web direto
      console.log('\nTentando método alternativo...');
      console.log('Você precisa executar manualmente no painel do Supabase:');
      console.log('ALTER TABLE public.ad_integrations DISABLE ROW LEVEL SECURITY;');
    }
    
  } catch (error) {
    console.error('Erro ao tentar desabilitar RLS:', error);
    console.log('\n=== INSTRUÇÕES MANUAIS ===');
    console.log('Como o RLS está bloqueando, você precisa:');
    console.log('1. Acessar https://supabase.com/dashboard');
    console.log('2. Ir ao seu projeto');
    console.log('3. Acessar "SQL Editor"');
    console.log('4. Executar: ALTER TABLE public.ad_integrations DISABLE ROW LEVEL SECURITY;');
    console.log('5. Ou criar uma policy que permita inserção');
  }
}

disableRLS();
