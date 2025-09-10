-- Esta função será executada toda vez que um novo usuário for criado na tabela auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_profile_id UUID;
  v_role public.workspace_role;
BEGIN
  -- Cria um perfil para o novo usuário
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  RETURNING id INTO v_profile_id;

  -- Verifica se o usuário foi convidado para um workspace específico
  v_workspace_id := (new.raw_user_meta_data->>'workspace_id_to_join')::UUID;
  v_role := (new.raw_user_meta_data->>'role')::public.workspace_role;

  IF v_workspace_id IS NOT NULL THEN
    -- Se sim, adiciona o usuário como membro daquele workspace com o papel definido no convite
    INSERT INTO public.workspace_members (workspace_id, profile_id, role)
    VALUES (v_workspace_id, v_profile_id, v_role);
  ELSE
    -- Se não (é o primeiro usuário, o dono da agência), cria um novo workspace para ele
    INSERT INTO public.workspaces (name)
    VALUES (COALESCE(new.raw_user_meta_data->>'company_name', new.email || ' Workspace'))
    RETURNING id INTO v_workspace_id;

    -- E o define como 'owner' (dono) do seu próprio workspace
    INSERT INTO public.workspace_members (workspace_id, profile_id, role)
    VALUES (v_workspace_id, v_profile_id, 'owner');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o gatilho que chama a função acima após cada novo registro de usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();