import fetch from 'node-fetch';

async function testSync() {
  try {
    const response = await fetch('https://cwnioogiqacbqunaungs.supabase.co/functions/v1/sync-campaigns', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzA4NjgsImV4cCI6MjA3MzA0Njg2OH0.rm6ahFHwS-p_ZXKb6vqwEqypv7Qe76ZR8uJps5M0moE',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ platform: 'meta' })
    });

    const data = await response.json();
    console.log('📋 Resposta completa:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.debug && data.debug.logs) {
      console.log('\n📝 Logs de debug:');
      data.debug.logs.forEach((log, index) => {
        console.log(`${index + 1}. ${log}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testSync();
