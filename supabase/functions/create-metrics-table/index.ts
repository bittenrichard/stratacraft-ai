import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

Deno.serve(async () => {
  try {
    console.log('🔄 Criando tabela campaign_metrics...');
    
    const { data, error } = await supabaseAdmin.rpc('exec', {
      sql: `
        -- Dropar a tabela se já existir para recriar
        DROP TABLE IF EXISTS campaign_metrics CASCADE;
        
        -- Criar tabela campaign_metrics para armazenar métricas das campanhas
        CREATE TABLE campaign_metrics (
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
        CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
        CREATE INDEX idx_campaign_metrics_date_key ON campaign_metrics(date_key);

        -- Desabilitar RLS temporariamente para facilitar desenvolvimento
        ALTER TABLE campaign_metrics DISABLE ROW LEVEL SECURITY;
        
        -- Permitir acesso público para leitura
        CREATE POLICY "Allow public read access to campaign_metrics" ON campaign_metrics
        FOR SELECT USING (true);
      `
    });

    if (error) {
      console.error('❌ Erro ao criar tabela:', error);
      return new Response(JSON.stringify({ error: error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('✅ Tabela campaign_metrics criada com sucesso!');
    
    return new Response(JSON.stringify({ 
      message: 'Tabela campaign_metrics criada com sucesso!' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
