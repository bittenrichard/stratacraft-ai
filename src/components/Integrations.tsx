import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isGAFormOpen, setGAFormOpen] = useState(false);
  const [gaFormData, setGaFormData] = useState({ propertyId: '', serviceAccountJson: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('ad_integrations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: any) {
      toast({ title: "Erro ao carregar integrações", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: string) => {
    // ... (código de conexão para Meta, Google Ads, etc. permanece o mesmo)
    toast({ title: `Conexão com ${platform} ainda não implementada.` });
  };
  
  const handleConnectGA = async () => {
    try {
      if (!gaFormData.propertyId || !gaFormData.serviceAccountJson) {
        throw new Error("Preencha todos os campos.");
      }
      const serviceAccount = JSON.parse(gaFormData.serviceAccountJson);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('ad_integrations').insert({
        user_id: user.id,
        platform: 'google-analytics',
        account_id: gaFormData.propertyId,
        account_name: `GA4 Property ${gaFormData.propertyId}`,
        is_active: true,
        settings: {
          property_id: gaFormData.propertyId,
          client_email: serviceAccount.client_email,
          private_key: serviceAccount.private_key
        }
      });
      if (error) throw error;
      toast({ title: "Google Analytics conectado com sucesso!" });
      setGAFormOpen(false);
      fetchIntegrations();
    } catch (error: any) {
      toast({ title: "Erro ao conectar Google Analytics", description: error.message, variant: "destructive" });
    }
  };


  const handleDelete = async (integrationId: string) => {
    try {
      const { error } = await supabase.from('ad_integrations').delete().eq('id', integrationId);
      if (error) throw error;
      toast({ title: "Integração removida" });
      fetchIntegrations();
    } catch (error: any) {
      toast({ title: "Erro ao remover integração", description: error.message, variant: "destructive" });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'meta': return <Facebook className="h-6 w-6" />;
      case 'google': return <Chrome className="h-6 w-6" />;
      case 'tiktok': return <Music className="h-6 w-6" />;
      case 'google-analytics': return <BarChart2 className="h-6 w-6" />;
      default: return <ExternalLink className="h-6 w-6" />;
    }
  };
  
  const getPlatformColor = (platform: string) => ({
    'meta': 'bg-blue-600', 'google': 'bg-green-600', 'tiktok': 'bg-black', 'google-analytics': 'bg-orange-500'
  }[platform] || 'bg-gray-600');

  const getPlatformName = (platform: string) => ({
    'meta': 'Meta Ads', 'google': 'Google Ads', 'tiktok': 'TikTok Ads', 'google-analytics': 'Google Analytics'
  }[platform] || platform);
  
  const isTokenExpired = (expiresAt: string | null) => !expiresAt || new Date(expiresAt) < new Date();

  const availablePlatforms = [
    { id: 'meta', name: 'Meta Ads', description: 'Facebook e Instagram Ads', action: () => handleConnect('meta') },
    { id: 'google', name: 'Google Ads', description: 'Google Search, Display e YouTube', action: () => handleConnect('google') },
    { id: 'tiktok', name: 'TikTok Ads', description: 'TikTok for Business', action: () => handleConnect('tiktok') },
    { id: 'google-analytics', name: 'Google Analytics', description: 'Dados de tráfego e conversão do site', action: () => { setIsAddDialogOpen(false); setGAFormOpen(true); } }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Integrações
        </h1>
        <p className="text-muted-foreground">
          Conecte suas contas para centralizar o gerenciamento de dados e campanhas.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Nova Integração
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Conectar Nova Plataforma</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              {availablePlatforms.map((p) => (
                <Card key={p.id} className="cursor-pointer hover:shadow-glow transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getPlatformColor(p.id)} text-white`}>{getPlatformIcon(p.id)}</div>
                      <div>
                        <h3 className="font-medium text-foreground">{p.name}</h3>
                        <p className="text-sm text-muted-foreground">{p.description}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={p.action}>Conectar</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isGAFormOpen} onOpenChange={setGAFormOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Conectar Google Analytics</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="ga-property">ID da Propriedade GA4</Label>
                <Input id="ga-property" placeholder="Ex: 123456789" value={gaFormData.propertyId} onChange={e => setGaFormData({...gaFormData, propertyId: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="ga-json">JSON da Conta de Serviço</Label>
                <Textarea id="ga-json" placeholder="Cole o conteúdo do arquivo JSON aqui" className="h-32" value={gaFormData.serviceAccountJson} onChange={e => setGaFormData({...gaFormData, serviceAccountJson: e.target.value})} />
              </div>
              <Button onClick={handleConnectGA} className="w-full">Conectar e Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
            <Card key={integration.id} className="bg-gradient-card border-border shadow-card">
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
                  <Badge variant={integration.is_active ? 'default' : 'destructive'} className={integration.is_active ? 'bg-green-100 text-green-800' : ''}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {integration.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1"><Settings className="h-4 w-4 mr-1" />Configurar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(integration.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
              </CardContent>
            </Card>
        ))}
       </div>
    </div>
  );
};

export default Integrations;