import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, TrendingUp, Eye, MousePointer, DollarSign, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget: string;
  created_time: string;
  insights: {
    data: [{
      impressions: string;
      clicks: string;
      spend: string;
      reach: string;
      cpm: string;
      cpc: string;
      ctr: string;
      conversions: string;
      cost_per_conversion: string;
      conversion_rate: string;
      date_start: string;
      date_stop: string;
      actions?: Array<{
        action_type: string;
        value: string;
      }>;
      action_values?: Array<{
        action_type: string;
        value: string;
      }>;
    }];
  };
}

const MetaCampaignsDemo = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<{ id: string; name: string } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [integrations, setIntegrations] = useState<{id: string, platform: string, is_active: boolean}[]>([]);
  const [hasConnectedIntegrations, setHasConnectedIntegrations] = useState(false);
  
  // Estados para o calendário de período
  const [dateRange, setDateRange] = useState<{since: string, until: string}>({
    since: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('last_30d');
  const [showCalendar, setShowCalendar] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Dados de demonstração com actions corretas
  const demoData = [
    {
      id: '120210000000000001',
      name: '[L] - ENGAJAMENTO - MENSAGEM - IG - 13/08/2025',
      status: 'ACTIVE',
      objective: 'OUTCOME_ENGAGEMENT',
      daily_budget: '15000',
      created_time: '2025-08-13T10:00:00+0000',
      insights: {
        data: [{
          impressions: '41634',
          clicks: '1369',
          spend: '546.11',
          reach: '24454',
          cpm: '13.12',
          cpc: '0.28',
          ctr: '4.73308',
          conversions: '0',
          cost_per_conversion: '0',
          conversion_rate: '0',
          date_start: '2025-08-13',
          date_stop: '2025-09-11',
          actions: [
            { action_type: 'like', value: '89' },
            { action_type: 'comment', value: '43' },
            { action_type: 'share', value: '12' },
            { action_type: 'post_engagement', value: '216' }
          ]
        }]
      }
    },
    {
      id: '120210000000000002',
      name: '[VIEW VÍDEO] - FEED/REELS - 03/07',
      status: 'ACTIVE', 
      objective: 'VIDEO_VIEWS',
      daily_budget: '8000',
      created_time: '2025-07-03T10:00:00+0000',
      insights: {
        data: [{
          impressions: '125847',
          clicks: '8392',
          spend: '423.67',
          reach: '89234',
          cpm: '3.37',
          cpc: '0.05',
          ctr: '6.67',
          conversions: '0',
          cost_per_conversion: '0',
          conversion_rate: '0',
          date_start: '2025-07-03',
          date_stop: '2025-09-11',
          actions: [
            { action_type: 'video_view', value: '36272' },
            { action_type: 'video_p25_watched', value: '28945' },
            { action_type: 'video_p50_watched', value: '15234' }
          ]
        }]
      }
    },
    {
      id: '120210000000000003',
      name: 'Conversão - Vendas Online',
      status: 'PAUSED',
      objective: 'CONVERSIONS',
      daily_budget: '25000',
      created_time: '2025-08-01T10:00:00+0000',
      insights: {
        data: [{
          impressions: '95123',
          clicks: '4567',
          spend: '1234.56',
          reach: '67890',
          cpm: '12.99',
          cpc: '0.27',
          ctr: '4.80',
          conversions: '78',
          cost_per_conversion: '15.83',
          conversion_rate: '1.71',
          date_start: '2025-08-01',
          date_stop: '2025-09-11',
          actions: [
            { action_type: 'purchase', value: '78' },
            { action_type: 'add_to_cart', value: '156' },
            { action_type: 'initiate_checkout', value: '123' }
          ]
        }]
      }
    },
    {
      id: '120210000000000004',
      name: 'Tráfego para Site',
      status: 'DRAFT',
      objective: 'LINK_CLICKS',
      daily_budget: '12000',
      created_time: '2025-09-01T10:00:00+0000',
      insights: {
        data: [{
          impressions: '67543',
          clicks: '3421',
          spend: '678.90',
          reach: '45123',
          cpm: '10.05',
          cpc: '0.20',
          ctr: '5.07',
          conversions: '45',
          cost_per_conversion: '15.09',
          conversion_rate: '1.32',
          date_start: '2025-09-01',
          date_stop: '2025-09-11',
          actions: [
            { action_type: 'link_click', value: '3421' },
            { action_type: 'landing_page_view', value: '2987' },
            { action_type: 'complete_registration', value: '45' }
          ]
        }]
      }
    }
  ];

  // Função para verificar integrações conectadas
  const checkConnectedIntegrations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar integrações conectadas do usuário
      const { data: integrations, error } = await supabase
        .from('ad_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'meta')
        .eq('is_active', true);

      if (error) {
        console.error('Erro ao buscar integrações:', error);
        return;
      }

      setIntegrations(integrations || []);
      setHasConnectedIntegrations((integrations || []).length > 0);
      
      if ((integrations || []).length > 0) {
        console.log('✅ Integrações Meta conectadas encontradas:', integrations?.length);
      } else {
        console.log('⚠️ Nenhuma integração Meta conectada');
      }
    } catch (error) {
      console.error('Erro ao verificar integrações:', error);
    }
  }, []);

  // Função para sincronizar campanhas reais
  const syncRealCampaigns = useCallback(async () => {
    if (!hasConnectedIntegrations) {
      console.log('⚠️ Sem integrações conectadas, usando dados demo');
      return loadDemoData();
    }

    setLoading(true);
    try {
      console.log('🔄 Sincronizando campanhas reais do Meta...');
      
      // Chamar a função Supabase para sincronizar campanhas
      const { data, error } = await supabase.functions.invoke('sync-campaigns', {
        body: {
          platform: 'meta',
          date_range: {
            since: dateRange.since,
            until: dateRange.until
          }
        }
      });

      if (error) {
        console.error('❌ Erro na sincronização:', error);
        throw error;
      }

      if (data && data.success && data.campaigns) {
        console.log('✅ Campanhas sincronizadas:', data.campaigns.length);
        setCampaigns(data.campaigns);
        setAccountInfo(data.account_info || null);
        setLastSync(new Date().toISOString());
        filterCampaigns(statusFilter);
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (error) {
      console.error('🚫 Erro na sincronização, carregando dados demo:', error);
      setError('Erro ao sincronizar campanhas. Carregando dados de demonstração.');
      loadDemoData();
    } finally {
      setLoading(false);
    }
  }, [hasConnectedIntegrations, dateRange, statusFilter]);

  // Carregar dados demo como fallback
  const loadDemoData = useCallback(() => {
    console.log('📊 Carregando dados de demonstração...');
    setCampaigns(demoData as Campaign[]);
    setAccountInfo({
      id: 'act_363168664437516',
      name: 'Carpiem Semi-Jóias'
    });
    setLastSync(new Date().toISOString());
    filterCampaigns(statusFilter);
  }, [statusFilter]);

  // Inicializar componente
  useEffect(() => {
    checkConnectedIntegrations();
  }, [checkConnectedIntegrations]);

  // Sincronizar quando integrações ou período mudarem
  useEffect(() => {
    if (hasConnectedIntegrations) {
      syncRealCampaigns();
    } else {
      loadDemoData();
    }
  }, [hasConnectedIntegrations, dateRange.since, dateRange.until, syncRealCampaigns, loadDemoData]);
    setLoading(true);
    setTimeout(() => {
      setCampaigns(demoData as Campaign[]);
      setFilteredCampaigns(demoData as Campaign[]);
      setAccountInfo({
        id: 'act_363168664437516',
        name: 'Carpiem Semi-Jóias'
      });
      setLastSync(new Date().toISOString());
      setLoading(false);
    }, 1000);
  }, []);

  // Helper function to get metrics from campaign
  const getMetrics = (campaign: Campaign) => {
    const defaultMetrics = {
      impressions: '0',
      clicks: '0',
      spend: '0',
      reach: '0',
      cpm: '0',
      cpc: '0',
      ctr: '0',
      conversions: '0',
      cost_per_conversion: '0',
      conversion_rate: '0'
    };
    return campaign.insights?.data?.[0] || defaultMetrics;
  };

  // Helper function to get results (actions) from campaign
  const getResults = (campaign: Campaign) => {
    const insights = campaign.insights?.data?.[0];
    if (!insights || !insights.actions) return 0;
    
    const actions = insights.actions;
    let totalResults = 0;
    
    actions.forEach((action) => {
      switch (campaign.objective) {
        case 'OUTCOME_ENGAGEMENT':
          if (['like', 'comment', 'share', 'post_engagement'].includes(action.action_type)) {
            totalResults += parseInt(action.value || '0');
          }
          break;
        case 'CONVERSIONS':
          if (['purchase', 'lead', 'complete_registration'].includes(action.action_type)) {
            totalResults += parseInt(action.value || '0');
          }
          break;
        case 'LINK_CLICKS':
          if (action.action_type === 'link_click') {
            totalResults += parseInt(action.value || '0');
          }
          break;
        case 'VIDEO_VIEWS':
          if (action.action_type === 'video_view') {
            totalResults += parseInt(action.value || '0');
          }
          break;
        default:
          if (actions.length > 0) {
            totalResults = parseInt(actions[0].value || '0');
          }
      }
    });
    
    return totalResults;
  };

  // Formatação PT-BR
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para filtrar campanhas
  const filterCampaigns = useCallback((status: string) => {
    if (status === 'todos') {
      setFilteredCampaigns(campaigns);
    } else {
      const filtered = campaigns.filter(campaign => 
        campaign.status.toUpperCase() === status.toUpperCase()
      );
      setFilteredCampaigns(filtered);
    }
    setStatusFilter(status);
  }, [campaigns]);

  // Atualizar filtros quando campanhas mudarem
  useEffect(() => {
    filterCampaigns(statusFilter);
  }, [campaigns, statusFilter, filterCampaigns]);

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'DELETED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'DRAFT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Ativa';
      case 'PAUSED':
        return 'Pausada';
      case 'ARCHIVED':
        return 'Arquivada';
      case 'DELETED':
        return 'Excluída';
      case 'DRAFT':
        return 'Rascunho';
      default:
        return status;
    }
  };

  const getObjectiveText = (objective: string) => {
    switch (objective.toUpperCase()) {
      case 'CONVERSIONS':
        return 'Conversões';
      case 'LINK_CLICKS':
        return 'Cliques no Link';
      case 'VIDEO_VIEWS':
        return 'Visualizações de Vídeo';
      case 'REACH':
        return 'Alcance';
      case 'TRAFFIC':
        return 'Tráfego';
      case 'BRAND_AWARENESS':
        return 'Reconhecimento da Marca';
      case 'OUTCOME_ENGAGEMENT':
        return 'Engajamento';
      case 'OUTCOME_AWARENESS':
        return 'Conscientização';
      default:
        return objective;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando campanhas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com informações da conta */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campanhas do Meta Ads</h2>
          {accountInfo && (
            <p className="text-sm text-gray-600">
              Conta: {accountInfo.name} (ID: {accountInfo.id})
            </p>
          )}
          {lastSync && (
            <p className="text-xs text-gray-500">
              Última sincronização: {formatDate(lastSync)} às {new Date(lastSync).toLocaleTimeString('pt-BR')}
            </p>
          )}
          <p className="text-xs text-blue-600">
            🎯 DEMONSTRAÇÃO: Dados com Actions Corretas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Recarregar
          </Button>
        </div>
      </div>

      {/* Seletor de Período */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Período:</span>
        </div>
        
        <Select value={selectedPreset} onValueChange={setSelectedPreset}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="last_7d">7 dias</SelectItem>
            <SelectItem value="last_14d">14 dias</SelectItem>
            <SelectItem value="last_30d">30 dias</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-slate-500 dark:text-slate-400">ou</span>

        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.since && dateRange?.until ? (
                `${format(new Date(dateRange.since), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(dateRange.until), 'dd/MM/yyyy', { locale: ptBR })}`
              ) : (
                "Período personalizado"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  onChange={(e) => setDateRange(prev => ({ 
                    since: e.target.value, 
                    until: prev?.until || e.target.value 
                  }))}
                  value={dateRange?.since || ''}
                />
                <span className="text-sm text-gray-500 self-center">até</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-sm"
                  onChange={(e) => setDateRange(prev => ({ 
                    since: prev?.since || e.target.value, 
                    until: e.target.value 
                  }))}
                  value={dateRange?.until || ''}
                />
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowCalendar(false)}
                disabled={!dateRange?.since || !dateRange?.until}
              >
                Aplicar Período
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filtros por Status */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => filterCampaigns('todos')}
          variant={statusFilter === 'todos' ? 'default' : 'outline'}
          size="sm"
        >
          Todas ({campaigns.length})
        </Button>
        <Button
          onClick={() => filterCampaigns('ACTIVE')}
          variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
          size="sm"
        >
          Ativas ({campaigns.filter(c => c.status === 'ACTIVE').length})
        </Button>
        <Button
          onClick={() => filterCampaigns('PAUSED')}
          variant={statusFilter === 'PAUSED' ? 'default' : 'outline'}
          size="sm"
        >
          Pausadas ({campaigns.filter(c => c.status === 'PAUSED').length})
        </Button>
        <Button
          onClick={() => filterCampaigns('DRAFT')}
          variant={statusFilter === 'DRAFT' ? 'default' : 'outline'}
          size="sm"
        >
          Rascunhos ({campaigns.filter(c => c.status === 'DRAFT').length})
        </Button>
      </div>

      {/* Lista de campanhas */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">
              {campaigns.length === 0 ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha encontrada com o filtro selecionado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <Badge className={getStatusColor(campaign.status)}>
                    {getStatusText(campaign.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Objetivo: {getObjectiveText(campaign.objective)}</span>
                  <span>Orçamento: {formatCurrency(parseFloat(campaign.daily_budget) / 100)}/dia</span>
                  <span>Criada: {formatDate(campaign.created_time)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {/* Gasto */}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">Gasto</p>
                      <p className="font-semibold">{formatCurrency(parseFloat(getMetrics(campaign).spend || '0'))}</p>
                    </div>
                  </div>

                  {/* Impressões */}
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Impressões</p>
                      <p className="font-semibold">{formatNumber(parseInt(getMetrics(campaign).impressions || '0'))}</p>
                    </div>
                  </div>

                  {/* Cliques */}
                  <div className="flex items-center space-x-2">
                    <MousePointer className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Cliques</p>
                      <p className="font-semibold">{formatNumber(parseInt(getMetrics(campaign).clicks || '0'))}</p>
                    </div>
                  </div>

                  {/* CTR */}
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-500">CTR</p>
                      <p className="font-semibold">{getMetrics(campaign).ctr}%</p>
                    </div>
                  </div>

                  {/* CPM */}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-xs text-gray-500">CPM</p>
                      <p className="font-semibold">{formatCurrency(parseFloat(getMetrics(campaign).cpm || '0'))}</p>
                    </div>
                  </div>

                  {/* CPC */}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-500">CPC</p>
                      <p className="font-semibold">{formatCurrency(parseFloat(getMetrics(campaign).cpc || '0'))}</p>
                    </div>
                  </div>

                  {/* Alcance */}
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs text-gray-500">Alcance</p>
                      <p className="font-semibold">{formatNumber(parseInt(getMetrics(campaign).reach || '0'))}</p>
                    </div>
                  </div>

                  {/* Resultados (prioridade principal) */}
                  <div className="flex items-center space-x-2 bg-green-50 p-2 rounded border border-green-200">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-green-700 font-medium">Resultados</p>
                      <p className="font-bold text-green-800">{formatNumber(getResults(campaign))}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MetaCampaignsDemo;
