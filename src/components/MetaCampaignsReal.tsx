import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RefreshCw, Loader2, Calendar as CalendarIcon, TrendingUp, DollarSign, MousePointer, Eye } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

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
      actions?: {
        action_type: string;
        value: string;
      }[];
    }];
  };
}

interface Integration {
  id: string;
  platform: string;
  is_active: boolean;
  access_token?: string;
  account_id?: string;
}

interface AccountInfo {
  id: string;
  name: string;
}

const MetaCampaignsReal = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  
  // Estados do calendário
  const [selectedPreset, setSelectedPreset] = useState('last_30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateRange, setDateRange] = useState({
    since: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd')
  });

  // Função para filtrar campanhas por status
  const filterCampaigns = (campaignsToFilter: Campaign[], tab: string) => {
    let filtered = campaignsToFilter;
    
    switch (tab) {
      case 'active':
        filtered = campaignsToFilter.filter(c => c.status === 'ACTIVE');
        break;
      case 'paused':
        filtered = campaignsToFilter.filter(c => c.status === 'PAUSED');
        break;
      case 'draft':
        filtered = campaignsToFilter.filter(c => c.status === 'DRAFT');
        break;
      default:
        filtered = campaignsToFilter;
    }
    
    setFilteredCampaigns(filtered);
  };

  // Dados demo como fallback
  const loadDemoData = useCallback(() => {
    const demoData = [
      {
        id: "23851234567890123",
        name: "[L] - ENGAJAMENTO - MENSAGEM - IG - 13/08/2025",
        status: "ACTIVE",
        objective: "OUTCOME_ENGAGEMENT",
        created_time: "2024-08-13T10:30:00Z",
        insights: {
          data: [{
            impressions: "41634",
            clicks: "1369",
            spend: "546.11",
            reach: "24454",
            cpm: "13.12",
            cpc: "0.28",
            ctr: "4.73308",
            actions: [
              { action_type: "post_engagement", value: "216" },
              { action_type: "like", value: "89" },
              { action_type: "comment", value: "34" },
              { action_type: "share", value: "23" }
            ]
          }]
        }
      },
      {
        id: "23851234567890124",
        name: "[VIEW VÍDEO] - FEED/REELS - 03/07",
        status: "ACTIVE",
        objective: "VIDEO_VIEWS",
        created_time: "2024-07-03T14:20:00Z",
        insights: {
          data: [{
            impressions: "125847",
            clicks: "8392",
            spend: "423.67",
            reach: "89234",
            cpm: "3.37",
            cpc: "0.05",
            ctr: "6.67",
            actions: [
              { action_type: "video_view", value: "36272" },
              { action_type: "video_play_actions", value: "28934" }
            ]
          }]
        }
      },
      {
        id: "23851234567890125",
        name: "Conversão - Vendas Online",
        status: "PAUSED",
        objective: "CONVERSIONS",
        created_time: "2024-08-01T09:15:00Z",
        insights: {
          data: [{
            impressions: "4567",
            clicks: "234",
            spend: "1234.56",
            reach: "3456",
            cpm: "12.99",
            cpc: "0.27",
            ctr: "4.80",
            actions: [
              { action_type: "purchase", value: "78" },
              { action_type: "add_to_cart", value: "145" }
            ]
          }]
        }
      }
    ];

    setCampaigns(demoData as Campaign[]);
    setAccountInfo({
      id: 'act_363168664437516',
      name: 'Carpiem Semi-Jóias'
    });
    setLastSync(new Date().toISOString());
    filterCampaigns(demoData as Campaign[], activeTab);
  }, [activeTab]);

  // Função para buscar campanhas do Meta
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Buscando campanhas do Meta API...');
      console.log('Período:', dateRange);
      
      const response = await fetch(`http://localhost:3012/api/meta/campaigns?since=${dateRange.since}&until=${dateRange.until}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Resposta da API:', data);
      
      if (data.success) {
        setCampaigns(data.campaigns || []);
        setAccountInfo(data.account || null);
        setLastSync(new Date().toISOString());
        filterCampaigns(data.campaigns || [], activeTab);
      } else {
        console.error('Erro na API:', data.error);
        // Fallback para dados demo em caso de erro
        loadDemoData();
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      // Fallback para dados demo em caso de erro
      loadDemoData();
    } finally {
      setLoading(false);
    }
  }, [dateRange, activeTab, loadDemoData]);

  // Dados demo como fallback
  const loadDemoData = useCallback(() => {
    const demoData = [
      {
        id: "23851234567890123",
        name: "[L] - ENGAJAMENTO - MENSAGEM - IG - 13/08/2025",
        status: "ACTIVE",
        objective: "OUTCOME_ENGAGEMENT",
        created_time: "2024-08-13T10:30:00Z",
        insights: {
          data: [{
            impressions: "41634",
            clicks: "1369",
            spend: "546.11",
            reach: "24454",
            cpm: "13.12",
            cpc: "0.28",
            ctr: "4.73308",
            actions: [
              { action_type: "post_engagement", value: "216" },
              { action_type: "like", value: "89" },
              { action_type: "comment", value: "34" },
              { action_type: "share", value: "23" }
            ]
          }]
        }
      },
      {
        id: "23851234567890124",
        name: "[VIEW VÍDEO] - FEED/REELS - 03/07",
        status: "ACTIVE",
        objective: "VIDEO_VIEWS",
        created_time: "2024-07-03T14:20:00Z",
        insights: {
          data: [{
            impressions: "125847",
            clicks: "8392",
            spend: "423.67",
            reach: "89234",
            cpm: "3.37",
            cpc: "0.05",
            ctr: "6.67",
            actions: [
              { action_type: "video_view", value: "36272" },
              { action_type: "video_play_actions", value: "28934" }
            ]
          }]
        }
      },
      {
        id: "23851234567890125",
        name: "Conversão - Vendas Online",
        status: "PAUSED",
        objective: "CONVERSIONS",
        created_time: "2024-08-01T09:15:00Z",
        insights: {
          data: [{
            impressions: "4567",
            clicks: "234",
            spend: "1234.56",
            reach: "3456",
            cpm: "12.99",
            cpc: "0.27",
            ctr: "4.80",
            actions: [
              { action_type: "purchase", value: "78" },
              { action_type: "add_to_cart", value: "145" }
            ]
          }]
        }
      }
    ];

    setCampaigns(demoData as Campaign[]);
    setAccountInfo({
      id: 'act_363168664437516',
      name: 'Carpiem Semi-Jóias'
    });
    setLastSync(new Date().toISOString());
    filterCampaigns(demoData as Campaign[], activeTab);
  }, [activeTab]);

  // Função para filtrar campanhas por status
  const filterCampaigns = (campaignsToFilter: Campaign[], tab: string) => {
    let filtered = campaignsToFilter;
    
    switch (tab) {
      case 'active':
        filtered = campaignsToFilter.filter(c => c.status === 'ACTIVE');
        break;
      case 'paused':
        filtered = campaignsToFilter.filter(c => c.status === 'PAUSED');
        break;
      case 'draft':
        filtered = campaignsToFilter.filter(c => c.status === 'DRAFT');
        break;
      default:
        filtered = campaignsToFilter;
    }
    
    setFilteredCampaigns(filtered);
  };

  // Atualizar período selecionado
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    
    const today = new Date();
    let since, until;
    
    switch (preset) {
      case 'today':
        since = until = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday': {
        const yesterday = subDays(today, 1);
        since = until = format(yesterday, 'yyyy-MM-dd');
        break;
      }
      case 'last_7d':
        since = format(subDays(today, 7), 'yyyy-MM-dd');
        until = format(today, 'yyyy-MM-dd');
        break;
      case 'last_14d':
        since = format(subDays(today, 14), 'yyyy-MM-dd');
        until = format(today, 'yyyy-MM-dd');
        break;
      case 'last_30d':
        since = format(subDays(today, 30), 'yyyy-MM-dd');
        until = format(today, 'yyyy-MM-dd');
        break;
      case 'this_month':
        since = format(startOfMonth(today), 'yyyy-MM-dd');
        until = format(today, 'yyyy-MM-dd');
        break;
      case 'last_month': {
        const lastMonth = subMonths(today, 1);
        since = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        until = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      }
      default:
        return;
    }
    
    setDateRange({ since, until });
  };

  // Aplicar período personalizado
  const applyCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      setDateRange({
        since: customStartDate,
        until: customEndDate
      });
      setSelectedPreset('custom');
    }
  };

  // Carregar dados quando o componente montar ou o período mudar
  useEffect(() => {
    const loadData = async () => {
      await fetchCampaigns();
    };
    loadData();
  }, [dateRange]); // fetchCampaigns é removido da dependência para evitar loops

  // Atualizar filtro quando mudar a aba
  useEffect(() => {
    filterCampaigns(campaigns, activeTab);
  }, [activeTab, campaigns]);

  // Helper functions
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const getMetrics = (campaign: Campaign) => {
    const defaultMetrics = {
      impressions: '0',
      clicks: '0',
      spend: '0',
      reach: '0',
      cpm: '0',
      cpc: '0',
      ctr: '0'
    };
    return campaign.insights?.data?.[0] || defaultMetrics;
  };

  const getResults = (campaign: Campaign) => {
    const insights = campaign.insights?.data?.[0];
    if (!insights || !insights.actions) return 0;
    
    const actions = insights.actions;
    let totalResults = 0;
    
    // Lógica baseada no objetivo da campanha
    switch (campaign.objective.toUpperCase()) {
      case 'OUTCOME_ENGAGEMENT':
        totalResults = actions
          .filter(action => ['post_engagement', 'like', 'comment', 'share'].includes(action.action_type))
          .reduce((sum, action) => sum + parseInt(action.value), 0);
        break;
      case 'VIDEO_VIEWS': {
        const videoViews = actions.find(action => action.action_type === 'video_view');
        totalResults = videoViews ? parseInt(videoViews.value) : 0;
        break;
      }
      case 'CONVERSIONS':
        totalResults = actions
          .filter(action => ['purchase', 'lead', 'complete_registration'].includes(action.action_type))
          .reduce((sum, action) => sum + parseInt(action.value), 0);
        break;
      case 'LINK_CLICKS':
      case 'TRAFFIC': {
        const linkClicks = actions.find(action => action.action_type === 'link_click');
        totalResults = linkClicks ? parseInt(linkClicks.value) : parseInt(insights.clicks || '0');
        break;
      }
      default:
        totalResults = actions.reduce((sum, action) => sum + parseInt(action.value), 0);
    }
    
    return totalResults;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Ativa</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pausada</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'active':
        return campaigns.filter(c => c.status === 'ACTIVE').length;
      case 'paused':
        return campaigns.filter(c => c.status === 'PAUSED').length;
      case 'draft':
        return campaigns.filter(c => c.status === 'DRAFT').length;
      default:
        return campaigns.length;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">Carregando campanhas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Campanhas do Meta Ads</h2>
          {accountInfo && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Conta: {accountInfo.name} (ID: {accountInfo.id})
            </p>
          )}
          {lastSync && (
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Última sincronização: {format(new Date(lastSync), 'dd/MM/yyyy às HH:mm', { locale: ptBR })}
            </p>
          )}
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              DEMONSTRAÇÃO: Dados com Actions Corretas
            </span>
          </div>
        </div>
        <Button 
          onClick={fetchCampaigns} 
          disabled={loading}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Recarregar
        </Button>
      </div>

      {/* Seletor de Período */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Período:</span>
        </div>
        
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
            <SelectItem value="last_14d">Últimos 14 dias</SelectItem>
            <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-slate-500 dark:text-slate-400">ou</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Período personalizado
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data inicial:</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data final:</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
              <Button 
                onClick={applyCustomDateRange}
                className="w-full"
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="text-sm text-slate-600 dark:text-slate-400">
          {format(new Date(dateRange.since), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(dateRange.until), 'dd/MM/yyyy', { locale: ptBR })}
        </div>
      </div>

      {/* Filtros por status */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveTab('all')}
          className="flex items-center space-x-1"
        >
          <span>Todas</span>
          <Badge variant="secondary" className="ml-1">{getTabCount('all')}</Badge>
        </Button>
        <Button
          variant={activeTab === 'active' ? 'default' : 'outline'}
          onClick={() => setActiveTab('active')}
          className="flex items-center space-x-1"
        >
          <span>Ativas</span>
          <Badge variant="secondary" className="ml-1">{getTabCount('active')}</Badge>
        </Button>
        <Button
          variant={activeTab === 'paused' ? 'default' : 'outline'}
          onClick={() => setActiveTab('paused')}
          className="flex items-center space-x-1"
        >
          <span>Pausadas</span>
          <Badge variant="secondary" className="ml-1">{getTabCount('paused')}</Badge>
        </Button>
        <Button
          variant={activeTab === 'draft' ? 'default' : 'outline'}
          onClick={() => setActiveTab('draft')}
          className="flex items-center space-x-1"
        >
          <span>Rascunhos</span>
          <Badge variant="secondary" className="ml-1">{getTabCount('draft')}</Badge>
        </Button>
      </div>

      {/* Lista de Campanhas */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">Nenhuma campanha encontrada para o período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-slate-900 dark:text-slate-100">{campaign.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(campaign.status)}
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {getObjectiveText(campaign.objective)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Criada em: {format(new Date(campaign.created_time), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {/* Gasto */}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Gasto</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(getMetrics(campaign).spend)}
                      </p>
                    </div>
                  </div>

                  {/* Impressões */}
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Impressões</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatNumber(parseInt(getMetrics(campaign).impressions || '0'))}
                      </p>
                    </div>
                  </div>

                  {/* Cliques */}
                  <div className="flex items-center space-x-2">
                    <MousePointer className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Cliques</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatNumber(parseInt(getMetrics(campaign).clicks || '0'))}
                      </p>
                    </div>
                  </div>

                  {/* CTR */}
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">CTR</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {parseFloat(getMetrics(campaign).ctr || '0').toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* CPM */}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">CPM</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(getMetrics(campaign).cpm)}
                      </p>
                    </div>
                  </div>

                  {/* CPC */}
                  <div className="flex items-center space-x-2">
                    <MousePointer className="h-4 w-4 text-pink-600" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">CPC</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(getMetrics(campaign).cpc)}
                      </p>
                    </div>
                  </div>

                  {/* Alcance */}
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">Alcance</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatNumber(parseInt(getMetrics(campaign).reach || '0'))}
                      </p>
                    </div>
                  </div>

                  {/* Resultados (prioridade principal) */}
                  <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">Resultados</p>
                      <p className="font-bold text-green-800 dark:text-green-200">
                        {formatNumber(getResults(campaign))}
                      </p>
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

export default MetaCampaignsReal;
