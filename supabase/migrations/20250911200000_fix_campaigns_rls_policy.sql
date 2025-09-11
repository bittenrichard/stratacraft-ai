-- Corrigir políticas RLS para permitir acesso às campanhas sincronizadas
-- Filename: 20250911200000_fix_campaigns_rls_policy.sql

-- Primeiro, vamos verificar se a tabela campaigns tem RLS habilitado
-- Se tiver, vamos criar uma política que permita leitura pública das campanhas

-- Desabilitar RLS da tabela campaigns para permitir acesso público
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

-- Ou, se preferir manter RLS com política pública:
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- 
-- -- Remover política existente se houver
-- DROP POLICY IF EXISTS "campaigns_select_policy" ON campaigns;
-- DROP POLICY IF EXISTS "campaigns_insert_policy" ON campaigns;
-- DROP POLICY IF EXISTS "campaigns_update_policy" ON campaigns;
-- 
-- -- Criar política que permite SELECT público
-- CREATE POLICY "campaigns_select_policy" ON campaigns 
--   FOR SELECT USING (true);
-- 
-- -- Criar política que permite INSERT apenas para service_role
-- CREATE POLICY "campaigns_insert_policy" ON campaigns 
--   FOR INSERT WITH CHECK (true);
-- 
-- -- Criar política que permite UPDATE apenas para service_role  
-- CREATE POLICY "campaigns_update_policy" ON campaigns 
--   FOR UPDATE USING (true);

-- Também vamos garantir que a tabela ad_integrations esteja acessível
ALTER TABLE ad_integrations DISABLE ROW LEVEL SECURITY;

-- E a tabela campaign_metrics
ALTER TABLE campaign_metrics DISABLE ROW LEVEL SECURITY;
