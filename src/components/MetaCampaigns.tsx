import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, DollarSign, Users, TrendingUp } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: number;
  spend: number;
  reach: number;
  impressions: number;
  results: number;
  start_time: string;
  end_time?: string;
}

export function MetaCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      // Busca o token do Meta no Supabase
      const { data: integration } = await supabase
        .from('ad_integrations')
        .select('*')
        .eq('platform', 'meta')
        .eq('is_active', true)
        .single();

      if (!integration?.access_token) {
        throw new Error('Integração com Meta não encontrada');
      }

      // Busca as campanhas na API do Meta
      const response = await fetch('http://localhost:3001/api/meta-campaigns', {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar campanhas');
      }

      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error: Error) {
      toast({
        title: "Erro ao carregar campanhas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-500',
      'PAUSED': 'bg-yellow-500',
      'COMPLETED': 'bg-blue-500',
      'DELETED': 'bg-red-500',
      'ARCHIVED': 'bg-gray-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Campanhas do Meta Ads</h2>
        <Button onClick={fetchCampaigns} disabled={loading}>
          {loading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              Nenhuma campanha encontrada
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Orçamento</p>
                      <p className="font-medium">{formatCurrency(campaign.budget)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Gasto</p>
                      <p className="font-medium">{formatCurrency(campaign.spend)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Alcance</p>
                      <p className="font-medium">{campaign.reach.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Resultados</p>
                      <p className="font-medium">{campaign.results.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Início: {new Date(campaign.start_time).toLocaleDateString()}</p>
                  {campaign.end_time && (
                    <p>Término: {new Date(campaign.end_time).toLocaleDateString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
