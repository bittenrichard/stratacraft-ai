import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  RefreshCw,
  Facebook,
  Chrome,
  Music
} from 'lucide-react';

interface Integration {
  id: string;
  platform: string;
  account_id: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

const Integrations = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setIntegrations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar integrações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    // Simular processo de OAuth
    toast({
      title: "Redirecionando para autenticação",
      description: `Você será redirecionado para conectar sua conta ${platform}.`,
    });

    // TODO: Implementar OAuth real com as APIs
    // Por enquanto, vamos simular uma conexão bem-sucedida
    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { error } = await supabase
          .from('ad_integrations')
          .insert({
            user_id: user.id,
            platform: platform,
            account_id: `${platform}_${Date.now()}`,
            account_name: `Conta ${platform.charAt(0).toUpperCase() + platform.slice(1)} Exemplo`,
            access_token: 'mock_token',
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dias
            is_active: true
          });

        if (error) throw error;

        toast({
          title: "Integração conectada com sucesso!",
          description: `Sua conta ${platform} foi conectada e está sincronizando.`,
        });

        setIsAddDialogOpen(false);
        fetchIntegrations();
      } catch (error: any) {
        toast({
          title: "Erro ao conectar integração",
          description: error.message,
          variant: "destructive",
        });
      }
    }, 2000);
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('ad_integrations')
        .update({ is_active: false })
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: "Integração desconectada",
        description: "A integração foi desconectada com sucesso.",
      });

      fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar integração",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('ad_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: "Integração removida",
        description: "A integração foi removida com sucesso.",
      });

      fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro ao remover integração",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'meta':
        return <Facebook className="h-6 w-6" />;
      case 'google':
        return <Chrome className="h-6 w-6" />;
      case 'tiktok':
        return <Music className="h-6 w-6" />;
      default:
        return <ExternalLink className="h-6 w-6" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'meta':
        return 'bg-blue-600';
      case 'google':
        return 'bg-green-600';
      case 'tiktok':
        return 'bg-black';
      default:
        return 'bg-gray-600';
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'meta':
        return 'Meta Ads';
      case 'google':
        return 'Google Ads';
      case 'tiktok':
        return 'TikTok Ads';
      default:
        return platform;
    }
  };

  const isTokenExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const availablePlatforms = [
    { id: 'meta', name: 'Meta Ads', description: 'Facebook e Instagram Ads' },
    { id: 'google', name: 'Google Ads', description: 'Google Search, Display e YouTube' },
    { id: 'tiktok', name: 'TikTok Ads', description: 'TikTok for Business' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando integrações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Integrações
        </h1>
        <p className="text-muted-foreground">
          Conecte suas contas de anúncios para centralizar o gerenciamento de campanhas
        </p>
      </div>

      {/* Add Integration Button */}
      <div className="mb-6">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nova Integração
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Conectar Nova Plataforma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {availablePlatforms.map((platform) => (
                <Card key={platform.id} className="cursor-pointer hover:shadow-glow transition-all duration-300 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getPlatformColor(platform.id)} text-white`}>
                          {getPlatformIcon(platform.id)}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{platform.name}</h3>
                          <p className="text-sm text-muted-foreground">{platform.description}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleConnect(platform.id)}
                        className="bg-gradient-primary"
                      >
                        Conectar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integrations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardContent className="p-12 text-center">
                <div className="text-muted-foreground">
                  <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma integração conectada</h3>
                  <p className="mb-4">Conecte suas contas de anúncios para começar a gerenciar campanhas.</p>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Conectar Primeira Integração
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          integrations.map((integration) => (
            <Card key={integration.id} className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getPlatformColor(integration.platform)} text-white`}>
                      {getPlatformIcon(integration.platform)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{getPlatformName(integration.platform)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{integration.account_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {integration.is_active && !isTokenExpired(integration.expires_at) ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ativa
                      </Badge>
                    ) : isTokenExpired(integration.expires_at) ? (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Expirada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Inativa
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">ID da Conta</p>
                    <p className="text-sm font-mono">{integration.account_id}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Conectado em</p>
                    <p className="text-sm">{new Date(integration.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  
                  {integration.expires_at && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expira em</p>
                      <p className="text-sm">{new Date(integration.expires_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Settings className="h-4 w-4 mr-1" />
                      Configurar
                    </Button>
                    
                    {integration.is_active ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        Desconectar
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleConnect(integration.platform)}
                      >
                        Reconectar
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Integration Status Summary */}
      {integrations.length > 0 && (
        <Card className="bg-gradient-card border-border shadow-card mt-8">
          <CardHeader>
            <CardTitle>Resumo das Integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">
                  {integrations.filter(i => i.is_active && !isTokenExpired(i.expires_at)).length}
                </p>
                <p className="text-sm text-green-600">Integrações Ativas</p>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-700">
                  {integrations.filter(i => isTokenExpired(i.expires_at)).length}
                </p>
                <p className="text-sm text-yellow-600">Tokens Expirados</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-2xl font-bold text-gray-700">
                  {integrations.filter(i => !i.is_active).length}
                </p>
                <p className="text-sm text-gray-600">Integrações Inativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integrations;