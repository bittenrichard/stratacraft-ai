-- Verificar políticas RLS da tabela campaigns
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'campaigns';

-- Desabilitar RLS temporariamente para testar
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

-- Ou criar uma política que permita acesso público para leitura
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "campaigns_select_policy" ON campaigns;
-- CREATE POLICY "campaigns_select_policy" ON campaigns FOR SELECT USING (true);
