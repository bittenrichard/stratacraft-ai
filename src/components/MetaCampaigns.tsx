import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  TrendingUp, 
  Eye, 
  AlertCircle,
  Calendar
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  updated_time: string;
  start_time?: string;
  stop_time?: string;
}

interface AccountInfo {
  account_id: string;
  account_name: string;
}

const MetaCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const workspaceId = user.id;
      console.log('Buscando campanhas para workspace:', workspaceId);

      // Buscar campanhas via API do servidor
      const response = await fetch(`http://localhost:3012/api/meta-campaigns?workspace_id=${workspaceId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar campanhas');
      }

      const data = await response.json();
      console.log('Campanhas recebidas:', data);

      setCampaigns(data.campaigns || []);
      setAccountInfo(data.account_info);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar campanhas:', error);
      toast({ 
        title: "Erro ao carregar campanhas", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Ativa';
      case 'paused':
        return 'Pausada';
      case 'archived':
        return 'Arquivada';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Carregando campanhas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campanhas do Meta Ads</h2>
          {accountInfo && (
            <p className="text-muted-foreground">
              Conta: {accountInfo.account_name} ({accountInfo.account_id})
            </p>
          )}
        </div>
        <Button onClick={fetchCampaigns} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Não foram encontradas campanhas ativas nesta conta do Meta Ads.
            </p>
            <Button onClick={fetchCampaigns}>
              Verificar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Objetivo: {campaign.objective}
                    </p>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>
                    {getStatusText(campaign.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Criada em</p>
                      <p className="text-muted-foreground">{formatDate(campaign.created_time)}</p>
                    </div>
                  </div>
                  
                  {campaign.start_time && (
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Início</p>
                        <p className="text-muted-foreground">{formatDate(campaign.start_time)}</p>
                      </div>
                    </div>
                  )}
                  
                  {campaign.stop_time && (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium">Fim</p>
                        <p className="text-muted-foreground">{formatDate(campaign.stop_time)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Atualizada</p>
                      <p className="text-muted-foreground">{formatDate(campaign.updated_time)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-3 w-3 mr-1" />
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Métricas
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export { MetaCampaigns };
export default MetaCampaigns;
