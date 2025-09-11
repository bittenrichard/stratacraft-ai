import fetch from 'node-fetch';

async function fixRLS() {
  try {
    const sql = `
      -- Desabilitar RLS para permitir acesso público às campanhas
      ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
      ALTER TABLE ad_integrations DISABLE ROW LEVEL SECURITY;  
      ALTER TABLE campaign_metrics DISABLE ROW LEVEL SECURITY;
    `;

    console.log('🔧 Executando correção de RLS...');
    
    const response = await fetch('https://cwnioogiqacbqunaungs.supabase.co/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ3MDg2OCwiZXhwIjoyMDczMDQ2ODY4fQ.mVqVT-Zg4zO_LHT2TJkjSWfqDdOKEfZuJgGY--nt7oU',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ3MDg2OCwiZXhwIjoyMDczMDQ2ODY4fQ.mVqVT-Zg4zO_LHT2TJkjSWfqDdOKEfZuJgGY--nt7oU'
      },
      body: JSON.stringify({ sql })
    });

    const result = await response.text();
    console.log('✅ Resultado da correção:', result);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixRLS();
