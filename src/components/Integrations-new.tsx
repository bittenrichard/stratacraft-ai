import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }
      
      console.log('Buscando integrações para usuário:', user.id);
      
      // Usar o próprio user_id como workspace_id (mesmo usado no callback)
      const workspaceId = user.id;
      console.log('Usando workspace_id:', workspaceId);
      
      // Buscar por workspace_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { data, error } = await (supabase as any)
        .from('ad_integrations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
        
      // Se deu erro ou não encontrou nada, tentar buscar todas (para debug)
      if (error || !data || data.length === 0) {
        console.log('Erro ao buscar por workspace_id ou nenhum resultado, tentando buscar todas:', error);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase as any)
          .from('ad_integrations')
          .select('*')
          .order('created_at', { ascending: false });
          
        data = result.data;
        error = result.error;
      }
        
      if (error) {
        console.error('Erro ao buscar integrações:', error);
        throw error;
      }
      
      console.log('Integrações encontradas:', data);
      setIntegrations(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro completo:', error);
      toast({ title: "Erro ao carregar integrações", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
      const redirectUri = isLocal
        ? 'http://localhost:8080/oauth/meta/callback'
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('ad_integrations').delete().eq('id', integrationId);
      if (error) throw error;
      
      toast({ title: "Integração desconectada com sucesso!" });
      fetchIntegrations();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ title: "Erro ao desconectar", description: errorMessage, variant: "destructive" });
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
        <Button onClick={fetchIntegrations} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availablePlatforms.map((platform) => {
          const isConnected = isPlatformConnected(platform.id);
          const connectedIntegration = getConnectedIntegration(platform.id);
          const IconComponent = platform.icon;

          return (
            <Card key={platform.id} className={`transition-all hover:shadow-md ${getColorClass(platform.color)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{platform.description}</p>
                    </div>
                  </div>
                  {isConnected ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {isConnected && connectedIntegration ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p><strong>Conta:</strong> {connectedIntegration.account_name}</p>
                      <p><strong>Conectado em:</strong> {new Date(connectedIntegration.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDisconnect(connectedIntegration.id)}
                      >
                        Desconectar
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Configurar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Esta plataforma não está conectada. Clique em conectar para autorizar o acesso.
                    </p>
                    <Button 
                      onClick={() => handleConnect(platform.id)}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Conectar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {integrations.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma integração conectada</h3>
            <p className="text-muted-foreground mb-4">
              Conecte suas contas de anúncios para começar a gerenciar suas campanhas em um só lugar.
            </p>
            <Button onClick={() => handleConnect('meta')}>
              Conectar primeira integração
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integrations;
