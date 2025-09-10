import React from 'react';
import { Card } from '@/components/ui/card';
import { MetaCampaigns } from './MetaCampaigns';
import { Tables } from '@/integrations/supabase/types';

const Campaigns = () => {

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_metrics (
            spend,
            impressions,
            clicks,
            ctr,
            cpc,
            roas,
            conversion_value
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      const campaignsWithAggregatedMetrics = (data || []).map(campaign => {
        // CORREÇÃO: Verificamos se campaign_metrics é um array antes de usar o .reduce()
        const campaignMetrics = Array.isArray(campaign.campaign_metrics) ? campaign.campaign_metrics as CampaignMetrics[] : [];
        
        const aggregatedMetrics = campaignMetrics.reduce(
          (acc, metric) => {
            acc.spend += metric.spend || 0;
            acc.impressions += metric.impressions || 0;
            acc.clicks += metric.clicks || 0;
            acc.conversion_value += metric.conversion_value || 0;
            return acc;
          },
          { spend: 0, impressions: 0, clicks: 0, conversion_value: 0 }
        );

        const ctr = aggregatedMetrics.impressions > 0 ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;
        const cpc = aggregatedMetrics.clicks > 0 ? aggregatedMetrics.spend / aggregatedMetrics.clicks : 0;
        const roas = aggregatedMetrics.spend > 0 ? aggregatedMetrics.conversion_value / aggregatedMetrics.spend : 0;

        return {
          ...campaign,
          metrics: {
            ...aggregatedMetrics,
            ctr,
            cpc,
            roas
          },
        };
      });

      setCampaigns(campaignsWithAggregatedMetrics as CampaignWithMetrics[]);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar campanhas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'pause' | 'activate' | 'delete') => {
    if (selectedCampaigns.length === 0) {
      toast({
        title: "Nenhuma campanha selecionada",
        description: "Selecione ao menos uma campanha para executar a ação.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('campaigns')
          .delete()
          .in('id', selectedCampaigns);
        if (error) throw error;
      } else {
        const newStatus = action === 'activate' ? 'active' : 'paused';
        const { error } = await supabase
          .from('campaigns')
          .update({ status: newStatus })
          .in('id', selectedCampaigns);
        if (error) throw error;
      }

      toast({
        title: "Ação executada com sucesso!",
        description: `${selectedCampaigns.length} campanha(s) foram atualizadas.`,
      });

      setSelectedCampaigns([]);
      await fetchCampaigns();
    } catch (error: any) {
      toast({
        title: "Erro ao executar ação",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || campaign.platform === filterPlatform;
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const getPlatformBadgeColor = (platform: string) => {
    switch (platform) {
      case 'meta': return 'bg-blue-500';
      case 'google': return 'bg-green-500';
      case 'tiktok': return 'bg-black';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'deleted': return 'destructive';
      default: return 'outline';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Gestão de Campanhas
        </h1>
        <p className="text-muted-foreground">
          Centralize e gerencie todas suas campanhas de mídia paga em uma única interface
        </p>
      </div>

      <Card className="bg-gradient-card border-border shadow-card mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="tiktok">TikTok Ads</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="paused">Pausadas</SelectItem>
                  <SelectItem value="deleted">Excluídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchCampaigns}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </div>
          </div>
          {selectedCampaigns.length > 0 && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">
                  {selectedCampaigns.length} campanha(s) selecionada(s)
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                    <Play className="h-4 w-4 mr-1" />
                    Ativar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('pause')}>
                    <Pause className="h-4 w-4 mr-1" />
                    Pausar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredCampaigns.length === 0 ? (
          <Card className="bg-gradient-card border-border shadow-card">
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
                <p>Crie uma nova campanha ou ajuste seus filtros de busca.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Checkbox
                      checked={selectedCampaigns.includes(campaign.id)}
                      onCheckedChange={() => toggleCampaignSelection(campaign.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${getPlatformBadgeColor(campaign.platform)} text-white`}>
                          {campaign.platform}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {campaign.objective} • Orçamento: R$ {campaign.budget_amount?.toFixed(2) || 'N/A'} ({campaign.budget_type})
                      </p>
                      {campaign.metrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Gasto</p>
                            <p className="text-sm font-medium">R$ {campaign.metrics.spend?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Impressões</p>
                            <p className="text-sm font-medium">{campaign.metrics.impressions?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cliques</p>
                            <p className="text-sm font-medium">{campaign.metrics.clicks?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">CTR</p>
                            <p className="text-sm font-medium">{campaign.metrics.ctr?.toFixed(2) || '0.00'}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">CPC</p>
                            <p className="text-sm font-medium">R$ {campaign.metrics.cpc?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">ROAS</p>
                            <p className="text-sm font-medium">{campaign.metrics.roas?.toFixed(1) || '0.0'}x</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Campaigns;