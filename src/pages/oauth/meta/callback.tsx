import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Interfaces
interface MetaAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
}

interface MetaAccountInfo {
  account_id: string;
  account_name: string;
  account_status: number;
  currency: string;
  timezone: string;
  all_accounts: MetaAccount[];
}

// Função para buscar informações da conta Meta
async function fetchMetaAccountInfo(accessToken: string): Promise<MetaAccountInfo> {
  try {
    const response = await fetch(
      'https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_status,currency,timezone_name&limit=500',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const firstAccount = data.data[0];
    if (!firstAccount) throw new Error('Nenhuma conta de anúncio encontrada');
    
    return {
      account_id: firstAccount.id,
      account_name: firstAccount.name,
      account_status: firstAccount.account_status,
      currency: firstAccount.currency,
      timezone: firstAccount.timezone_name,
      all_accounts: data.data
    };
  } catch (error) {
    console.error('Erro ao buscar informações da conta Meta:', error);
    throw new Error('Erro ao buscar informações da conta Meta');
  }
}

// Hook personalizado para parâmetros de query
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const MetaOAuthCallback: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Handler para troca do código por token
  const handleExchangeToken = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const isLocal = window.location.hostname === 'localhost';
      const redirect_uri = isLocal
        ? 'http://localhost:8080/oauth/meta/callback'
        : 'https://dashboard.agenciastorytelling.com.br/oauth/meta/callback';
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api/meta-exchange-token'
        : 'https://apidash.agenciastorytelling.com.br/api/meta-exchange-token';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri }),
      });

      const data = await res.json();
      if (!data.access_token) {
        throw new Error(data.error?.message || 'Erro ao trocar o code pelo token');
      }

      setToken(data.access_token);
      
      // Buscar informações da conta Meta
      const accountInfo = await fetchMetaAccountInfo(data.access_token);
      
      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      // Salvar integração no Supabase
      await supabase.from('ad_integrations').insert({
        user_id: user.id,
        platform: 'meta',
        account_id: accountInfo.account_id,
        account_name: accountInfo.account_name,
        access_token: data.access_token,
        is_active: true,
        settings: accountInfo
      });

      toast({ 
        title: 'Conta Meta conectada!', 
        description: `Conta ${accountInfo.account_name} conectada com sucesso.` 
      });

      // Redirecionar para página de integrações
      setTimeout(() => {
        navigate('/integrations');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado ao conectar conta Meta';
      console.error('Erro:', error);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  // Effect para iniciar o processo de autenticação
  useEffect(() => {
    const codeParam = query.get('code');
    const errorParam = query.get('error');

    if (codeParam) {
      toast({ title: 'Código recebido!', description: 'Trocando pelo access token...' });
      handleExchangeToken(codeParam).catch(error => {
        console.error('Erro no processo de autenticação:', error);
        setError(error instanceof Error ? error.message : 'Erro inesperado na autenticação');
        toast({ 
          title: 'Erro na autenticação', 
          description: error instanceof Error ? error.message : 'Erro inesperado na autenticação',
          variant: 'destructive' 
        });
      });
    } else if (errorParam) {
      setError(errorParam);
      toast({ 
        title: 'Erro na autenticação', 
        description: errorParam, 
        variant: 'destructive' 
      });
    }
  }, [query, handleExchangeToken, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <Card className="w-full max-w-md bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle>Conexão Meta Ads</CardTitle>
          <CardDescription>
            {loading ? 'Processando conexão...' : 
             error ? 'Erro na conexão' : 
             token ? 'Conta Meta conectada com sucesso!' : 
             'Aguardando resposta do Meta...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-pulse">Processando conexão...</div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">
              <div className="font-semibold">Erro:</div>
              <div>{error}</div>
            </div>
          ) : token ? (
            <div className="space-y-4 p-4">
              <div className="text-center text-green-600 font-semibold">
                Conexão realizada com sucesso!
              </div>
              <div className="text-sm text-muted-foreground">
                Redirecionando para a página de integrações...
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetaOAuthCallback;
