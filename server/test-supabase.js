const supabase = require('./supabase');

async function testSupabaseConnection() {
  try {
    console.log('Testando conexão com Supabase...');
    
    // Testa a conexão básica
    const { data, error } = await supabase
      .from('ad_integrations')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Erro na conexão:', error);
      
      // Se a tabela não existir, vamos criá-la
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('Tabela ad_integrations não existe. Criando...');
        
        // Criar a tabela
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS ad_integrations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            platform TEXT NOT NULL,
            access_token TEXT NOT NULL,
            account_id TEXT,
            account_name TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE,
            settings JSONB DEFAULT '{}'::jsonb
          );
          
          CREATE INDEX IF NOT EXISTS idx_ad_integrations_platform ON ad_integrations(platform);
          CREATE INDEX IF NOT EXISTS idx_ad_integrations_active ON ad_integrations(is_active);
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableQuery });
        
        if (createError) {
          console.error('Erro ao criar tabela:', createError);
        } else {
          console.log('Tabela criada com sucesso!');
        }
      }
    } else {
      console.log('Conexão com Supabase OK!', data);
    }
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

// Executa o teste se for chamado diretamente
if (require.main === module) {
  testSupabaseConnection();
}

module.exports = testSupabaseConnection;
