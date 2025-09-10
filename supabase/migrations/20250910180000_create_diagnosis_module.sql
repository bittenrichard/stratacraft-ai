-- Tabela para armazenar as respostas do questionário de diagnóstico de um workspace
CREATE TABLE public.diagnosis_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- As respostas serão armazenadas em um formato flexível (JSONB)
  responses JSONB NOT NULL,
  
  -- Status do diagnóstico
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar o plano de ação gerado pela IA
CREATE TABLE public.action_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_id UUID NOT NULL REFERENCES public.diagnosis_responses(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- O plano gerado também será armazenado como JSONB
  plan_data JSONB NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilita a segurança em nível de linha para as novas tabelas
ALTER TABLE public.diagnosis_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

-- Cria as políticas de segurança
CREATE POLICY "Workspace members can manage diagnosis responses" 
ON public.diagnosis_responses FOR ALL USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can view action plans" 
ON public.action_plans FOR SELECT USING (public.is_workspace_member(workspace_id));

-- Adiciona os gatilhos para atualizar 'updated_at'
CREATE TRIGGER update_diagnosis_responses_updated_at
  BEFORE UPDATE ON public.diagnosis_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();