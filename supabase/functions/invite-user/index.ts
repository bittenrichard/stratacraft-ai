import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from 'shared/cors.ts'

Deno.serve(async (req) => {
  // Lida com a requisição pre-flight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, role, workspace_id } = await req.json()
    if (!email || !role || !workspace_id) {
      throw new Error("Email, role, and workspace_id are required.")
    }

    // Cria um cliente de administração do Supabase, que tem permissões elevadas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // 1. Convida o usuário para o sistema de autenticação do Supabase
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
            role: role,
            workspace_id_to_join: workspace_id
        }
    })

    if (inviteError) throw inviteError

    // O usuário foi convidado, mas ainda não foi adicionado como membro do workspace.
    // Isso acontecerá através de um gatilho no banco de dados quando ele aceitar o convite e se cadastrar.
    // Vamos criar esse gatilho no próximo passo.

    return new Response(JSON.stringify({ message: `Convite enviado para ${email}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})