import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  Upload,
  Facebook,
  Chrome,
  Music,
  BarChart2
} from 'lucide-react';

interface Integration {
  id: string;
  platform: string;
  account_id: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  settings?: any;
  is_local?: boolean;
  workspace_id?: string;
}

const Integrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Plataformas disponíveis
  const availablePlatforms = [
    {
      id: 'meta',
      name: 'Meta Ads',
      description: 'Facebook e Instagram Ads',
      icon: Facebook,
      color: 'blue'
    },
    {
      id: 'google',
      name: 'Google Ads',
      description: 'Google Search e Display Ads',
      icon: Chrome,
      color: 'green'
    },
    {
      id: 'tiktok',
      name: 'TikTok Ads',
      description: 'TikTok for Business',
      icon: Music,
      color: 'black'
    },
    {
      id: 'google-analytics',
      name: 'Google Analytics',
      description: 'Analytics e métricas de website',
      icon: BarChart2,
      color: 'orange'
    }
  ];

  // Função para sincronizar dados do localStorage com o banco
  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('Buscando integrações para usuário:', user?.id || 'não autenticado');
      
      // Criar chave do localStorage baseada no usuário (para multi-tenancy)
      const localStorageKey = user?.id ? `meta_integration_data_${user.id}` : 'meta_integration_data';
      
      let data = null;
      let error = null;
      
      if (user) {
        // Usar o próprio user_id como workspace_id (mesmo usado no callback)
        const workspaceId = user.id;
        console.log('Usando workspace_id:', workspaceId);
        
        try {
          // Buscar por workspace_id na tabela 'ad_integrations'
          const result = await supabase
            .from('ad_integrations')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
            
          data = result.data;
          error = result.error;
          
          if (error) {
            console.error('Erro ao buscar do banco:', error);
          } else {
            console.log('Dados encontrados no banco:', data);
          }
        } catch (dbError) {
          console.error('Erro ao conectar com o banco:', dbError);
          error = dbError;
        }
      } else {
        console.log('Usuário não autenticado, usando apenas localStorage');
        error = new Error('User not authenticated');
      }

      // Se há erro no banco ou dados vazios, usar localStorage como fallback
      if (error || !data || data.length === 0) {
        console.log('Verificando localStorage para fallback...');
        const localData = localStorage.getItem(localStorageKey);
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            console.log('Dados encontrados no localStorage:', parsedData);
            
            // Adicionar campos necessários para compatibilidade
            const integrationData = {
              ...parsedData,
              id: user?.id ? `local-meta-${user.id}` : 'local-meta-integration',
              is_local: true,
              workspace_id: user?.id || null
            };
            
            data = [integrationData];
            error = null;
          } catch (parseError) {
            console.error('Erro ao fazer parse dos dados locais:', parseError);
            data = [];
          }
        } else {
          console.log('Nenhum dado encontrado no localStorage');
          data = [];
        }
      }
        
      if (error && data?.length === 0) {
        console.error('Erro final ao buscar integrações:', error);
        throw error;
      }
      
      console.log('Integrações carregadas final:', data);
      
      // Mostrar aviso se está usando dados locais
      const hasLocalData = data && data.length > 0 && data.some((item: any) => item.is_local);
      if (hasLocalData) {
        toast({ 
          title: "Dados carregados do cache local", 
          description: "Integração salva localmente. Dados serão sincronizados quando possível.",
          variant: "default"
        });
      }
      
      setIntegrations(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro completo:', error);
      toast({ title: "Erro ao carregar integrações", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const syncLocalData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const localStorageKey = user?.id ? `meta_integration_data_${user.id}` : 'meta_integration_data';
    const localData = localStorage.getItem(localStorageKey);
    if (!localData) return;

    try {
      const parsedData = JSON.parse(localData);
      if (!user) return;

      // Tentar salvar no banco
      const { error } = await supabase
        .from('ad_integrations')
        .insert([{
          workspace_id: user.id,
          platform: 'meta',
          access_token: parsedData.access_token,
          account_id: parsedData.account_id,
          account_name: parsedData.account_name,
          is_active: true
        }]);

      if (!error) {
        // Sucesso - remover do localStorage
        localStorage.removeItem(localStorageKey);
        console.log('Dados sincronizados com sucesso do localStorage para o banco');
        // Recarregar integrações
        fetchIntegrations();
        toast({
          title: "Sincronização concluída",
          description: "Dados locais foram sincronizados com o servidor.",
        });
      }
    } catch (error) {
      console.log('Erro na sincronização dos dados locais:', error);
    }
  }, [fetchIntegrations, toast]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Verificar se uma plataforma está conectada
  const isPlatformConnected = (platformId: string) => {
    return integrations.some(integration => 
      integration.platform === platformId && integration.is_active
    );
  };

  // Obter dados da integração conectada
  const getConnectedIntegration = (platformId: string) => {
    return integrations.find(integration => 
      integration.platform === platformId && integration.is_active
    );
  };

  const handleConnect = async (platform: string) => {
    if (platform === 'meta') {
      const appId = '707350985805370';
      // Detecta ambiente para redirect_uri
      const isLocal = window.location.hostname === 'localhost';
      const currentPort = window.location.port;
      const redirectUri = isLocal
        ? `http://localhost:${currentPort || '8080'}/oauth/meta/callback`
        : 'https://dashboard.agenciastorytelling.com.br/oauth/meta/callback';
      const scope = [
        'ads_management',
        'ads_read',
        'business_management',
        'pages_show_list',
        'catalog_management',
        'instagram_basic',
        'instagram_content_publish',
        'pages_read_engagement',
        'pages_manage_ads',
        'public_profile',
        'attribution_read'
      ].join(',');
      
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: scope,
        response_type: 'code',
        state: 'meta'
      });
      
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
      window.location.href = authUrl;
      return;
    }
    
    toast({ title: `Conexão com ${platform} ainda não implementada.` });
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      // Verificar se é uma integração local ou do banco
      const integration = integrations.find(int => int.id === integrationId);
      
      if (!integration) {
        throw new Error('Integração não encontrada');
      }

      // Se é uma integração local (identificada pelo prefixo 'local-' ou propriedade is_local)
      const isLocalIntegration = integrationId.startsWith('local-') || integration.is_local;
      
      if (isLocalIntegration) {
        console.log('Removendo integração local:', integrationId);
        
        // Buscar usuário atual para determinar a chave do localStorage
        const { data: { user } } = await supabase.auth.getUser();
        const localStorageKey = user?.id ? `meta_integration_data_${user.id}` : 'meta_integration_data';
        
        // Remover do localStorage
        localStorage.removeItem(localStorageKey);
        
        toast({ 
          title: "Integração desconectada!", 
          description: "Dados locais removidos com sucesso."
        });
      } else {
        console.log('Removendo integração do banco:', integrationId);
        
        // Remover do banco de dados
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('ad_integrations')
          .delete()
          .eq('id', integrationId);
          
        if (error) {
          console.error('Erro ao deletar do banco:', error);
          throw error;
        }
        
        toast({ 
          title: "Integração desconectada!", 
          description: "Integração removida do banco de dados."
        });
      }
      
      // Atualizar a lista de integrações
      fetchIntegrations();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao desconectar integração:', error);
      toast({ 
        title: "Erro ao desconectar", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  };

  const getIconComponent = (platformId: string) => {
    const platform = availablePlatforms.find(p => p.id === platformId);
    if (!platform) return Chrome;
    return platform.icon;
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      black: 'border-gray-200 bg-gray-50',
      orange: 'border-orange-200 bg-orange-50'
    };
    return colorMap[color] || 'border-gray-200 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Carregando integrações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-muted-foreground">
            Conecte suas contas para centralizar o gerenciamento de dados e campanhas.
          </p>
        </div>
        <div className="flex space-x-2">
          {/* Verificar se há dados locais para mostrar botão de sincronização */}
          {(() => {
            const userId = integrations.find(int => int.workspace_id)?.workspace_id;
            const localStorageKey = userId ? `meta_integration_data_${userId}` : 'meta_integration_data';
            return localStorage.getItem(localStorageKey) && (
              <Button onClick={syncLocalData} variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Sincronizar Cache
              </Button>
            );
          })()}
          <Button onClick={fetchIntegrations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availablePlatforms.map((platform) => {
          const IconComponent = platform.icon;
          const isConnected = isPlatformConnected(platform.id);
          const connectedIntegration = getConnectedIntegration(platform.id);

          return (
            <Card key={platform.id} className={`${getColorClass(platform.color)} transition-all duration-200 hover:shadow-md`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <IconComponent className="h-8 w-8 text-gray-700" />
                  {isConnected ? (
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-2">{platform.name}</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">
                  {platform.description}
                </p>
                
                {isConnected && connectedIntegration ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium">Conta conectada:</p>
                      <p className="text-muted-foreground">{connectedIntegration.account_name}</p>
                      {connectedIntegration.is_local && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Dados locais
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleDisconnect(connectedIntegration.id)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Desconectar
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleConnect(platform.id)} 
                    className="w-full"
                    size="sm"
                  >
                    Conectar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {integrations.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Nenhuma integração encontrada
          </h3>
          <p className="text-sm text-muted-foreground">
            Conecte uma plataforma para começar.
          </p>
        </div>
      )}
    </div>
  );
};

export default Integrations;
