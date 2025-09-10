-- Tabela para armazenar os insights gerados pela IA
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- O insight em si (texto gerado) e o tipo (ex: otimização, alerta)
  content TEXT NOT NULL,
  insight_type TEXT NOT NULL DEFAULT 'suggestion' CHECK (insight_type IN ('suggestion', 'warning', 'opportunity')),
  
  -- Indica se o insight já foi visto pelo usuário
  is_read BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilita a segurança em nível de linha
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Cria as políticas de segurança: membros do workspace podem ver e gerenciar seus insights
CREATE POLICY "Workspace members can manage their own AI insights"
ON public.ai_insights
FOR ALL
USING (public.is_workspace_member(workspace_id));