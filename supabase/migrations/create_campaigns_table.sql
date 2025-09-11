-- Criar tabela campaigns para armazenar campanhas sincronizadas
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL, -- ID da campanha na plataforma externa (Meta, Google, etc.)
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'archived', 'deleted')),
    objective TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_time TIMESTAMPTZ,
    stop_time TIMESTAMPTZ,
    metrics JSONB DEFAULT '{}', -- Armazenar métricas como JSON
    last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índices para performance
    UNIQUE(workspace_id, external_id, platform)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_last_sync ON campaigns(last_sync);

-- Habilitar RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Política RLS: usuários só podem ver campanhas do seu workspace
CREATE POLICY "Users can view campaigns from their workspace" ON campaigns
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM user_workspaces 
            WHERE user_id = auth.uid()
        )
    );

-- Política RLS: usuários podem inserir campanhas no seu workspace
CREATE POLICY "Users can insert campaigns in their workspace" ON campaigns
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id 
            FROM user_workspaces 
            WHERE user_id = auth.uid()
        )
    );

-- Política RLS: usuários podem atualizar campanhas do seu workspace
CREATE POLICY "Users can update campaigns from their workspace" ON campaigns
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM user_workspaces 
            WHERE user_id = auth.uid()
        )
    );

-- Política RLS: usuários podem deletar campanhas do seu workspace
CREATE POLICY "Users can delete campaigns from their workspace" ON campaigns
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM user_workspaces 
            WHERE user_id = auth.uid()
        )
    );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();
