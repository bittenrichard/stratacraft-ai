-- Criar tabela ad_integrations
CREATE TABLE IF NOT EXISTS public.ad_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'google-analytics')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  account_id TEXT,
  account_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE public.ad_integrations DISABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ad_integrations_workspace_id ON public.ad_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ad_integrations_platform ON public.ad_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_ad_integrations_active ON public.ad_integrations(is_active);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ad_integrations_updated_at
  BEFORE UPDATE ON public.ad_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
