-- Tabela para armazenar os eventos do calendário (posts de social media)
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- Legenda do post
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'posted')),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok')),
  creative_asset_id UUID REFERENCES public.creative_assets(id) ON DELETE SET NULL, -- Link para a biblioteca de criativos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilita a segurança em nível de linha
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Cria as políticas de acesso: usuários só podem ver e gerenciar seus próprios eventos
CREATE POLICY "Users can manage their own calendar events"
ON public.calendar_events
FOR ALL
USING (auth.uid() = user_id);

-- Cria o gatilho para atualizar o campo 'updated_at' automaticamente
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();