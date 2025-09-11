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

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_campaign_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_campaign_metrics_updated_at
    BEFORE UPDATE ON campaign_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_metrics_updated_at();
