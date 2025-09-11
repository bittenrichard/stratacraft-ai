-- Criar tabela integrations se não existir
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL,
    platform TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    platform_user_id TEXT,
    platform_user_name TEXT,
    platform_user_email TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, platform)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_integrations_workspace_id ON integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON integrations(is_active);

-- RLS (Row Level Security)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias integrações
CREATE POLICY IF NOT EXISTS "Users can view own integrations" ON integrations
    FOR SELECT USING (auth.uid() = workspace_id);

-- Política para permitir que usuários insiram suas próprias integrações
CREATE POLICY IF NOT EXISTS "Users can insert own integrations" ON integrations
    FOR INSERT WITH CHECK (auth.uid() = workspace_id);

-- Política para permitir que usuários atualizem suas próprias integrações
CREATE POLICY IF NOT EXISTS "Users can update own integrations" ON integrations
    FOR UPDATE USING (auth.uid() = workspace_id);

-- Política para permitir que usuários deletem suas próprias integrações
CREATE POLICY IF NOT EXISTS "Users can delete own integrations" ON integrations
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
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
