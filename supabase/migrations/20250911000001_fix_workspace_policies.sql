-- Corrigir recursão infinita nas policies de workspace_members
-- Arquivo: 20250911000001_fix_workspace_policies.sql

-- Remove as policies problemáticas
DROP POLICY IF EXISTS "Users can view members of their own workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON public.workspace_members;

-- Cria policies diretas para workspace_members sem usar is_workspace_member()
CREATE POLICY "Users can view workspace members where they are members" 
ON public.workspace_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = profile_id AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.workspace_members wm2
    JOIN public.profiles p2 ON wm2.profile_id = p2.id
    WHERE wm2.workspace_id = workspace_members.workspace_id 
    AND p2.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage workspace members" 
ON public.workspace_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.profiles p ON wm.profile_id = p.id
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND p.user_id = auth.uid() 
    AND wm.role = 'owner'
  )
);

-- Alternativa: desabilitar RLS temporariamente para workspace_members se o problema persistir
-- ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;
