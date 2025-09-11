-- Script para inserir dados de teste das integrações Meta
-- Execute este script no Supabase SQL Editor para testar o sistema

-- 1. Inserir uma integração Meta de teste
INSERT INTO integrations (
  id,
  platform,
  status,
  account_id,
  account_name,
  access_token,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'meta',
  'active',
  '363168664437516',
  'Conta Meta Teste',
  'EAAG7Q1ZCrZBFkBOZCDummyTokenForTesting123',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 2. Inserir campanhas de exemplo
WITH integration_data AS (
  SELECT id as integration_id 
  FROM integrations 
  WHERE platform = 'meta' AND status = 'active' 
  LIMIT 1
)
INSERT INTO campaigns (
  id,
  integration_id,
  external_id,
  name,
  platform,
  status,
  objective,
  budget_amount,
  budget_type,
  start_date,
  end_date,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  integration_data.integration_id,
  values.external_id,
  values.name,
  'meta',
  values.status,
  values.objective,
  values.budget_amount,
  values.budget_type,
  values.start_date,
  values.end_date,
  NOW(),
  NOW()
FROM integration_data
CROSS JOIN (VALUES
  ('23851234567890123', 'Campanha Primavera 2024', 'active', 'CONVERSIONS', 50.00, 'daily', '2024-09-01'::timestamptz, '2024-12-31'::timestamptz),
  ('23851234567890124', 'Promoção Black Friday', 'active', 'REACH', 75.00, 'daily', '2024-11-15'::timestamptz, '2024-11-30'::timestamptz),
  ('23851234567890125', 'Campanha Brand Awareness', 'paused', 'BRAND_AWARENESS', 30.00, 'daily', '2024-08-01'::timestamptz, NULL),
  ('23851234567890126', 'Retargeting Carrinho Abandono', 'active', 'CONVERSIONS', 40.00, 'daily', '2024-09-15'::timestamptz, NULL)
) AS values(external_id, name, status, objective, budget_amount, budget_type, start_date, end_date)
ON CONFLICT (integration_id, external_id) DO NOTHING;

-- 3. Inserir métricas de exemplo para as campanhas
WITH campaign_data AS (
  SELECT id as campaign_id, external_id
  FROM campaigns 
  WHERE platform = 'meta'
)
INSERT INTO campaign_metrics (
  id,
  campaign_id,
  date_key,
  spend,
  impressions,
  clicks,
  ctr,
  cpc,
  cpm,
  reach,
  actions,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  campaign_data.campaign_id,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  values.spend,
  values.impressions,
  values.clicks,
  values.ctr,
  values.cpc,
  values.cpm,
  values.reach,
  values.actions::jsonb,
  NOW(),
  NOW()
FROM campaign_data
CROSS JOIN (VALUES
  ('23851234567890123', 245.50, 15430, 892, 5.78, 0.275, 15.91, 12890, '[{"action_type": "purchase", "value": "12"}, {"action_type": "add_to_cart", "value": "45"}]'),
  ('23851234567890124', 389.75, 28540, 1205, 4.22, 0.323, 13.65, 22150, '[{"action_type": "purchase", "value": "18"}, {"action_type": "lead", "value": "67"}]'),
  ('23851234567890125', 156.20, 9875, 324, 3.28, 0.482, 15.82, 8750, '[{"action_type": "page_view", "value": "234"}]'),
  ('23851234567890126', 198.90, 12340, 567, 4.59, 0.351, 16.12, 10890, '[{"action_type": "purchase", "value": "8"}, {"action_type": "add_to_cart", "value": "23"}]')
) AS values(external_id, spend, impressions, clicks, ctr, cpc, cpm, reach, actions)
WHERE campaign_data.external_id = values.external_id
ON CONFLICT (campaign_id, date_key) DO NOTHING;

-- Verificar os dados inseridos
SELECT 
  i.platform,
  i.account_name,
  c.name as campaign_name,
  c.status,
  c.objective,
  c.budget_amount,
  cm.spend,
  cm.impressions,
  cm.clicks
FROM integrations i
JOIN campaigns c ON c.integration_id = i.id
LEFT JOIN campaign_metrics cm ON cm.campaign_id = c.id
WHERE i.platform = 'meta'
ORDER BY c.name;
