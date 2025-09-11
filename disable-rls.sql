-- Desabilitar RLS para a tabela campaigns
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

-- Verificar o status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'campaigns';
