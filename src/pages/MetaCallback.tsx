import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Função para salvar a integração com a conta selecionada
const saveIntegration = async (selectedAccount: any, accessToken: string, userInfo: any, workspaceId: string, adAccounts: any[]) => {
  console.log('Salvando integração para conta:', selectedAccount.name, selectedAccount.id);
  
  const integrationData = {
    workspace_id: workspaceId,
    platform: 'meta',
    access_token: accessToken,
    account_id: selectedAccount.id.replace('act_', ''), // Remover prefixo 'act_' se presente
    account_name: selectedAccount.name,
    is_active: true,
    settings: {
      user_info: userInfo,
      ad_accounts: adAccounts,
      selected_account: selectedAccount
    }
  };

  try {
    // Primeiro, verificar se já existe uma integração Meta para este workspace
    const { data: existing, error: checkError } = await supabase
      .from('ad_integrations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'meta')
      .limit(1);

    let result;
    if (existing && existing.length > 0) {
      // Atualizar existente
      result = await supabase
        .from('ad_integrations')
        .update(integrationData)
        .eq('id', existing[0].id)
        .select();
    } else {
      // Inserir novo
      result = await supabase
        .from('ad_integrations')
        .insert([integrationData])
        .select();
    }

    if (result.error) {
      console.error('Erro ao salvar integração no banco:', result.error);
      throw result.error;
    } else {
      console.log('Integração salva com sucesso no banco!', result.data);
    }
  } catch (dbError) {
    console.error('Erro na tentativa de salvar no banco:', dbError);
    // Salvar no localStorage como fallback
    const localStorageKey = `meta_integration_data_${workspaceId}`;
    localStorage.setItem(localStorageKey, JSON.stringify({
      ...integrationData,
      created_at: new Date().toISOString()
    }));
    console.log('Dados salvos no localStorage como fallback');
  }
};

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
          workspace_id: workspaceId,
          app_id: '707350985805370', // Meta App ID
          app_secret: 'c960b0d5bab06fc898a209ade4435007' // Meta App Secret
        };
        
        console.log('Fazendo troca do código por token diretamente via Meta API...');

        // Fazer a troca do código pelo token diretamente via Meta API
        const metaTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
          `client_id=${requestBody.app_id}` +
          `&redirect_uri=${encodeURIComponent(requestBody.redirect_uri)}` +
          `&client_secret=${requestBody.app_secret}` +
          `&code=${requestBody.code}`;

        const metaResponse = await fetch(metaTokenUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!metaResponse.ok) {
          const errorText = await metaResponse.text();
          console.error('Erro na resposta do Meta:', metaResponse.status, errorText);
          throw new Error(`Meta API error: ${metaResponse.status} - ${errorText}`);
        }

        const tokenData = await metaResponse.json();
        console.log('Token recebido do Meta:', tokenData.access_token ? 'presente' : 'ausente');

        if (!tokenData.access_token) {
          throw new Error('Token não retornado pelo Meta');
        }

        // Buscar informações do usuário do Meta
        console.log('Buscando informações do usuário Meta...');
        const userInfoResponse = await fetch(
          `https://graph.facebook.com/v19.0/me?access_token=${tokenData.access_token}&fields=id,name,email`
        );

        const userInfo = await userInfoResponse.json();
        console.log('Informações do usuário:', { id: userInfo.id, name: userInfo.name });

        // Buscar contas de anúncios
        console.log('Buscando contas de anúncios...');
        const adAccountsResponse = await fetch(
          `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${tokenData.access_token}&fields=id,name,account_status,currency`
        );

        const adAccountsData = await adAccountsResponse.json();
        const adAccounts = adAccountsData.data || [];
        console.log(`Encontradas ${adAccounts.length} contas de anúncios`);

        // Se não há contas de anúncios, mostrar erro
        if (adAccounts.length === 0) {
          throw new Error('Nenhuma conta de anúncios encontrada. Verifique se você tem acesso a contas de anúncios no Meta Business Manager.');
        }

        // Se há apenas uma conta, usar automaticamente
        if (adAccounts.length === 1) {
          const selectedAccount = adAccounts[0];
          await saveIntegration(selectedAccount, tokenData.access_token, userInfo, workspaceId, adAccounts);
          
          toast({
            title: "Conexão bem sucedida!",
            description: `Conta ${selectedAccount.name} conectada com sucesso!`
          });

          localStorage.setItem('openTab', 'integrations');
          navigate('/');
          return;
        }

        // Se há múltiplas contas, salvar dados temporários e redirecionar para seleção
        const tempData = {
          access_token: tokenData.access_token,
          user_info: userInfo,
          ad_accounts: adAccounts,
          workspace_id: workspaceId
        };

        sessionStorage.setItem('meta_temp_data', JSON.stringify(tempData));
        navigate('/meta/select-account');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Erro no callback:', error);
        
        // Tentar fallback: salvar dados básicos localmente
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          localStorage.setItem('meta_auth_code', code);
          localStorage.setItem('meta_auth_attempted', Date.now().toString());
        }
        
        toast({
          title: "Erro na conexão",
          description: errorMessage,
          variant: "destructive"
        });
        
        // Redireciona para integrações mesmo com erro
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
