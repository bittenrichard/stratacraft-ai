-- Verificar estrutura da tabela ad_integrations
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ad_integrations'
ORDER BY ordinal_position;

-- Se a tabela não existir, criar:
CREATE TABLE IF NOT EXISTS ad_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL,
    platform TEXT NOT NULL,
    access_token TEXT NOT NULL,
    account_id TEXT NOT NULL, -- Este campo é obrigatório
    account_name TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ad_integrations_workspace_id ON ad_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ad_integrations_platform ON ad_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_ad_integrations_is_active ON ad_integrations(is_active);
