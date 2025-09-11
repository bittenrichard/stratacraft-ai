const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

// Configurar fetch global
global.fetch = fetch;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  try {
    console.log('Executando migração para criar tabela ad_integrations...');
    
    // Ler o arquivo SQL
    const sql = fs.readFileSync('create_integrations_table.sql', 'utf8');
    
    console.log('SQL a ser executado:');
    console.log(sql);
    
    // Executar usando RPC direto no banco
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.error('Erro ao executar migração:', error);
      // Tentar método alternativo usando SQL direto
      console.log('Tentando método alternativo...');
      
      // Como não temos RPC configurado, vamos tentar criar a tabela manualmente
      const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      const resultData = await result.text();
      console.log('Resultado alternativo:', resultData);
      
    } else {
      console.log('Migração executada com sucesso:', data);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

executeMigration();
