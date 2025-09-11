import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://cwnioogiqacbqunaungs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTkzMTQ4MywiZXhwIjoyMDQxNTA3NDgzfQ.BGZnKbVy3CnY7gLfJx-6K7k2gNzD2m8XrfGqOJrY2kE';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createCampaignMetricsTable() {
  try {
    console.log('🔄 Criando tabela campaign_metrics...');
    
    const { data, error } = await supabaseAdmin.rpc('exec', {
      sql: `
        -- Criar tabela campaign_metrics para armazenar métricas das campanhas
        CREATE TABLE IF NOT EXISTS campaign_metrics (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
            date_key DATE NOT NULL,
            
            -- Métricas básicas
            spend NUMERIC(10, 2) DEFAULT 0.00,
            impressions INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            ctr NUMERIC(5, 4) DEFAULT 0.0000,
            cpc NUMERIC(10, 4) DEFAULT 0.0000,
            cpm NUMERIC(10, 4) DEFAULT 0.0000,
            reach INTEGER DEFAULT 0,
            
            -- Métricas de conversão
            roas NUMERIC(10, 4) DEFAULT 0.0000,
            conversion_value NUMERIC(10, 2) DEFAULT 0.00,
            
            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            
            -- Chave única para evitar duplicidade
            UNIQUE(campaign_id, date_key)
        );

        -- Criar índices para performance
        CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date_key ON campaign_metrics(date_key);

        -- Desabilitar RLS temporariamente para facilitar desenvolvimento
        ALTER TABLE campaign_metrics DISABLE ROW LEVEL SECURITY;
      `
    });

    if (error) {
      console.error('❌ Erro ao criar tabela:', error);
      return;
    }

    console.log('✅ Tabela campaign_metrics criada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

createCampaignMetricsTable();
