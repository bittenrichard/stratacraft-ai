-- Migration para corrigir e padronizar a estrutura de campanhas

-- 1. Corrigir tabela campaigns (se ainda não existir, será criada)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL, -- ID da campanha na plataforma externa
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'archived', 'draft')),
    objective TEXT,
    budget_amount NUMERIC(10, 2) DEFAULT 0.00,
    budget_type TEXT DEFAULT 'daily' CHECK (budget_type IN ('daily', 'lifetime')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Chave única para evitar duplicidades
    UNIQUE(integration_id, external_id)
);

-- 2. Corrigir tabela campaign_metrics (se ainda não existir, será criada)
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
    
    -- Ações do Meta (conversões, etc.)
    actions JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Chave única para evitar duplicidade
    UNIQUE(campaign_id, date_key)
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_campaigns_integration_id ON campaigns(integration_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_external_id ON campaigns(external_id);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date_key ON campaign_metrics(date_key);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_actions ON campaign_metrics USING GIN (actions);

-- 4. Desabilitar RLS temporariamente para facilitar desenvolvimento
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics DISABLE ROW LEVEL SECURITY;

-- 5. Funções para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_campaign_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_campaigns_updated_at ON campaigns;
CREATE TRIGGER trigger_update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();

DROP TRIGGER IF EXISTS trigger_update_campaign_metrics_updated_at ON campaign_metrics;
CREATE TRIGGER trigger_update_campaign_metrics_updated_at
    BEFORE UPDATE ON campaign_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_metrics_updated_at();
