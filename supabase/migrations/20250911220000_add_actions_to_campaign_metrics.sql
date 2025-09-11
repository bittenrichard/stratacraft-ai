-- Adicionar coluna actions à tabela campaign_metrics para armazenar dados de ações do Meta
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb;

-- Criar índice para consultas nas actions
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_actions ON campaign_metrics USING GIN (actions);
