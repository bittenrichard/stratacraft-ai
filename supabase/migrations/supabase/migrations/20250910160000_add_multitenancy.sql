-- PASSO 1: Remover TODAS as políticas de segurança antigas que dependem da coluna 'user_id'
-- Fazemos isso primeiro para que seja possível modificar as tabelas.
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.ad_integrations;
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can manage their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage their own creative assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Users can manage their own funnel data" ON public.funnel_data;
DROP POLICY IF EXISTS "Users can view their own funnel data" ON public.funnel_data;
DROP POLICY IF EXISTS "Users can manage their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view metrics for their campaigns" ON public.campaign_metrics;


-- PASSO 2: Criar a tabela de Workspaces (se não existir)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Criar a tabela de membros do Workspace (se não existir)
-- Usamos 'CREATE TYPE IF NOT EXISTS' que requer uma função auxiliar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
        CREATE TYPE public.workspace_role AS ENUM ('owner', 'member', 'client');
    END IF;
END$$;
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL,
  PRIMARY KEY (workspace_id, profile_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar a função auxiliar de segurança
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    JOIN public.profiles p ON wm.profile_id = p.id
    WHERE wm.workspace_id = p_workspace_id
    AND p.user_id = auth.uid()
  ) INTO is_member;
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 5: Modificar todas as tabelas de dados para usar 'workspace_id'
-- Adiciona a nova coluna, se ela ainda não existir
ALTER TABLE public.ad_integrations ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.creative_assets ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.funnel_data ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_metrics ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Remove a coluna 'user_id' antiga, agora que as políticas foram removidas
ALTER TABLE public.ad_integrations DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.calendar_events DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.creative_assets DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.funnel_data DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.leads DROP COLUMN IF EXISTS user_id;


-- PASSO 6: Recriar TODAS as políticas de segurança com a nova lógica de Workspaces
-- (Garantindo que políticas antigas com o mesmo nome sejam removidas antes)
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
CREATE POLICY "Users can view their own workspaces" ON public.workspaces FOR SELECT USING (public.is_workspace_member(id));

DROP POLICY IF EXISTS "Users can view members of their own workspace" ON public.workspace_members;
CREATE POLICY "Users can view members of their own workspace" ON public.workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Owners can manage workspace members" ON public.workspace_members;
CREATE POLICY "Owners can manage workspace members" ON public.workspace_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.profiles p ON wm.profile_id = p.id
    WHERE wm.workspace_id = workspace_members.workspace_id AND p.user_id = auth.uid() AND wm.role = 'owner'
  )
);

CREATE POLICY "Workspace members can manage integrations" ON public.ad_integrations FOR ALL USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can manage campaigns" ON public.campaigns FOR ALL USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can manage calendar events" ON public.calendar_events FOR ALL USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can manage creative assets" ON public.creative_assets FOR ALL USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can manage funnel data" ON public.funnel_data FOR ALL USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can manage leads" ON public.leads FOR ALL USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can view campaign metrics" ON public.campaign_metrics FOR SELECT USING (public.is_workspace_member(workspace_id));