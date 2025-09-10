-- Altera a tabela de integrações para suportar mais plataformas
-- e adiciona um campo para guardar configurações específicas (como as do Google Analytics)
ALTER TABLE public.ad_integrations
  ADD COLUMN settings JSONB,
  DROP CONSTRAINT ad_integrations_platform_check,
  ADD CONSTRAINT ad_integrations_platform_check CHECK (platform IN ('meta', 'google', 'tiktok', 'google-analytics'));

-- Adiciona um índice para otimizar as buscas por plataforma
CREATE INDEX idx_ad_integrations_platform ON public.ad_integrations(platform);