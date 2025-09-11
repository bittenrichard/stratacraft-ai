-- Criar tabela workspaces primeiro
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela user_workspaces para relacionar usuários com workspaces
CREATE TABLE IF NOT EXISTS user_workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Garantir que um usuário só pode ter um registro por workspace
    UNIQUE(user_id, workspace_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_workspace_id ON user_workspaces(workspace_id);

-- Habilitar RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para workspaces
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
    FOR SELECT USING (
        id IN (
            SELECT workspace_id 
            FROM user_workspaces 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workspaces" ON workspaces
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update their workspaces" ON workspaces
    FOR UPDATE USING (
        id IN (
            SELECT workspace_id 
            FROM user_workspaces 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas RLS para user_workspaces
CREATE POLICY "Users can view their workspace memberships" ON user_workspaces
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can be added to workspaces" ON user_workspaces
    FOR INSERT WITH CHECK (
        -- O usuário pode ser adicionado por um admin do workspace
        EXISTS (
            SELECT 1 FROM user_workspaces 
            WHERE workspace_id = NEW.workspace_id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
        OR 
        -- Ou está criando seu próprio workspace (primeiro usuário)
        (user_id = auth.uid() AND role = 'admin')
    );

-- Função para criar workspace padrão para novos usuários
CREATE OR REPLACE FUNCTION create_default_workspace_for_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Criar workspace padrão
    INSERT INTO workspaces (name, description)
    VALUES ('Meu Workspace', 'Workspace padrão criado automaticamente')
    RETURNING id INTO new_workspace_id;
    
    -- Adicionar usuário como admin do workspace
    INSERT INTO user_workspaces (user_id, workspace_id, role)
    VALUES (NEW.id, new_workspace_id, 'admin');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar workspace automático
CREATE TRIGGER trigger_create_default_workspace
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_workspace_for_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER trigger_update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_workspaces_updated_at
    BEFORE UPDATE ON user_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
