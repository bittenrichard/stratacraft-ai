// Script para executar a função create-metrics-table
async function createTable() {
  try {
    const response = await fetch('https://cwnioogiqacbqunaungs.supabase.co/functions/v1/create-metrics-table', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTkzMTQ4MywiZXhwIjoyMDQxNTA3NDgzfQ.BGZnKbVy3CnY7gLfJx-6K7k2gNzD2m8XrfGqOJrY2kE',
        'Content-Type': 'application/json'
      }
    });

    const result = await response.text();
    console.log('Resultado:', result);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

createTable();
