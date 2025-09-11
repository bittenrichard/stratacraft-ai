import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function MetaCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('=== INÍCIO DO CALLBACK ===');
        
        // Pega o código da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        console.log('URL params:', urlParams.toString());
        console.log('Código extraído:', code);
        
        if (!code) {
          throw new Error('Código não fornecido pelo Facebook');
        }

        console.log('Buscando usuário atual...');
        // Buscar usuário atual para ter o workspace_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        const workspaceId = user.id; // Usar o ID do usuário como workspace_id

        // Detecta ambiente para redirect_uri
        const isLocal = window.location.hostname === 'localhost';
        const currentPort = window.location.port;
        const redirectUri = isLocal
          ? `http://localhost:${currentPort || '8080'}/oauth/meta/callback`
          : 'https://dashboard.agenciastorytelling.com.br/oauth/meta/callback';

        console.log('Usando redirect_uri:', redirectUri);
        console.log('Código recebido:', code);
        console.log('Workspace ID:', workspaceId);

        const requestBody = {
          code,
          redirect_uri: redirectUri,
          workspace_id: workspaceId
        };
        
        console.log('Fazendo requisição para servidor com body:', requestBody);

        // Faz a troca do código pelo token
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

        const response = await fetch('http://localhost:3001/api/meta-exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('Resposta recebida:', response.status, response.statusText);

        if (!response.ok) {
          const error = await response.json();
          console.error('Erro da resposta:', error);
          throw new Error(error.message || 'Erro ao trocar código por token');
        }

        const data = await response.json();
        console.log('Dados recebidos do servidor:', data);
        
        // Primeiro, salva no localStorage para não perder os dados
        localStorage.setItem('meta_access_token', data.access_token);
        if (data.account_info) {
          localStorage.setItem('meta_account_info', JSON.stringify(data.account_info));
        }
        
        // Tenta salvar integração diretamente no Supabase (primeira tentativa)
        console.log('Salvando integração no Supabase...');
        const integrationData = {
          workspace_id: workspaceId,
          platform: 'meta',
          access_token: data.access_token,
          account_id: data.account_info?.id || null,
          account_name: data.account_info?.name || 'Meta Account',
          is_active: true,
          expires_at: data.expires_in ? new Date(Date.now() + (data.expires_in * 1000)).toISOString() : null,
          settings: {
            account_status: data.account_info?.account_status,
            token_type: data.token_type
          }
        };

        const { data: dbData, error: dbError } = await supabase
          .from('ad_integrations')
          .insert([integrationData])
          .select();

        if (dbError) {
          console.error('Erro ao salvar no Supabase:', dbError);
          
          // Se falhar, tenta fazer uma requisição para o backend salvar
          console.log('Tentando salvar via backend...');
          try {
            const saveResponse = await fetch('http://localhost:3001/api/save-integration', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(integrationData)
            });
            
            if (saveResponse.ok) {
              const saveResult = await saveResponse.json();
              console.log('Salvo via backend com sucesso:', saveResult);
            } else {
              console.log('Erro ao salvar via backend:', await saveResponse.text());
            }
          } catch (saveError) {
            console.error('Erro na requisição de save:', saveError);
          }
        } else {
          console.log('Integração salva com sucesso no Supabase:', dbData);
        }
        
        // Notifica o usuário
        toast({
          title: "Conexão bem sucedida!",
          description: `Conta ${data.account_info?.name || ''} conectada com sucesso.`
        });

        // Redireciona de volta para a página inicial e sinaliza para abrir a tab de integrações
        localStorage.setItem('openTab', 'integrations');
        navigate('/');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Erro no callback:', error);
        toast({
          title: "Erro na conexão",
          description: errorMessage,
          variant: "destructive"
        });
        // No erro também redirecionamos para a página inicial
        localStorage.setItem('openTab', 'integrations');
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Processando conexão...</h1>
        <p className="text-muted-foreground">Por favor, aguarde enquanto conectamos sua conta.</p>
      </div>
    </div>
  );
}
