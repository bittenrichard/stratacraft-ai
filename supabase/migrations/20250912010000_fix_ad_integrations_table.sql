-- Garantir que a tabela ad_integrations existe e tem os campos necessários
CREATE TABLE IF NOT EXISTS ad_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL,
    platform TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    account_id TEXT,
    account_name TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, platform)
);

-- Adicionar campos que podem estar faltando (se a tabela já existir)
DO $$
BEGIN
    -- Adicionar refresh_token se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ad_integrations' AND column_name = 'refresh_token') THEN
        ALTER TABLE ad_integrations ADD COLUMN refresh_token TEXT;
    END IF;
    
    -- Adicionar settings se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ad_integrations' AND column_name = 'settings') THEN
        ALTER TABLE ad_integrations ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;
    
    -- Adicionar expires_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ad_integrations' AND column_name = 'expires_at') THEN
        ALTER TABLE ad_integrations ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ad_integrations_workspace_id ON ad_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ad_integrations_platform ON ad_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_ad_integrations_active ON ad_integrations(is_active);

-- RLS (Row Level Security)
ALTER TABLE ad_integrations ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view own integrations" ON ad_integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON ad_integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON ad_integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON ad_integrations;

-- Políticas para permitir que usuários acessem apenas suas próprias integrações
CREATE POLICY "Users can view own integrations" ON ad_integrations
    FOR SELECT USING (auth.uid() = workspace_id);

CREATE POLICY "Users can insert own integrations" ON ad_integrations
    FOR INSERT WITH CHECK (auth.uid() = workspace_id);

CREATE POLICY "Users can update own integrations" ON ad_integrations
    FOR UPDATE USING (auth.uid() = workspace_id);

CREATE POLICY "Users can delete own integrations" ON ad_integrations
    FOR DELETE USING (auth.uid() = workspace_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_ad_integrations_updated_at ON ad_integrations;
CREATE TRIGGER update_ad_integrations_updated_at
    BEFORE UPDATE ON ad_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
