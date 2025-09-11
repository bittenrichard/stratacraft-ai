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
  daily_budget?: string;
  budget_amount?: number;
  start_date?: string;
  created_time?: string;
  insights?: {
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


const MetaCampaignsFixed = () => {
  // Estados principais
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Estados de integração
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [hasConnectedIntegrations, setHasConnectedIntegrations] = useState(false);
  
  // Estados do calendário
  const [selectedPreset, setSelectedPreset] = useState('last_30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateRange, setDateRange] = useState({
    since: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd')
  });

  // Verificar integrações conectadas
  const checkConnectedIntegrations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ Usuário não autenticado');
        setHasConnectedIntegrations(false);
        return;
      }

      const { data: integrations, error } = await supabase
        .from('ad_integrations')
        .select('*')
        .eq('platform', 'meta')
        .eq('is_active', true);

      if (error) {
        console.log('⚠️ Tabela de integrações não encontrada:', error.message);
        setHasConnectedIntegrations(false);
        setIntegrations([]);
        return;
      }

      setIntegrations(integrations || []);
      const hasIntegrations = (integrations || []).length > 0;
      setHasConnectedIntegrations(hasIntegrations);
      
      if (hasIntegrations) {
        console.log('✅ Integrações Meta conectadas:', integrations?.length);
      } else {
        console.log('⚠️ Nenhuma integração Meta conectada');
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar integrações:', error);
      setHasConnectedIntegrations(false);
      setIntegrations([]);
    }
  }, []);

  // Sincronizar campanhas reais
  const syncRealCampaigns = useCallback(async () => {
    if (!hasConnectedIntegrations) {
      console.log('⚠️ Sem integrações conectadas');
      setCampaigns([]);
      setAccountInfo(null);
      setLastSync(null);
      setError('Nenhuma integração Meta conectada. Conecte uma conta para visualizar campanhas reais.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Sincronizando campanhas reais do Meta...');
      
      const { data, error } = await supabase.functions.invoke('sync-campaigns', {
        body: {
          platform: 'meta',
          date_range: {
            since: dateRange.since,
            until: dateRange.until
          }
        }
      });

      console.log('📥 Resposta da função Edge:', { data, error });

      if (error) {
        console.error('❌ Erro da função Edge:', error);
        throw new Error(`Erro na sincronização: ${JSON.stringify(error)}`);
      }

      if (data && data.message === 'Sync completed successfully!') {
        console.log('✅ Sincronização concluída com sucesso');
        
        // Agora buscar as campanhas usando a função Edge que tem acesso admin
        console.log('🔍 Buscando campanhas via função Edge com acesso admin...');
        const { data: campaignsData, error: campaignsError } = await supabase.functions.invoke('get-campaigns', {
          body: { 
            platform: 'meta',
            date_range: {
              since: dateRange.since,
              until: dateRange.until
            }
          }
        });

        if (campaignsError) {
          console.error('❌ Erro ao buscar campanhas via função Edge:', campaignsError);
          throw new Error(`Erro ao buscar campanhas: ${campaignsError.message}`);
        }

        const campaigns = campaignsData?.campaigns || [];
        console.log('✅ Campanhas encontradas via função Edge:', campaigns.length);
        console.log('📋 Campanhas da função Edge:', campaigns);
        setCampaigns(campaigns);
        setLastSync(new Date().toISOString());
      } else {
        console.error('❌ Resposta inesperada:', data);
        throw new Error(`Resposta inesperada da API: ${JSON.stringify(data)}`);
      }
    } catch (syncError) {
      console.error('🚫 Erro na sincronização:', syncError);
      setError('Erro ao sincronizar campanhas reais. Verifique os logs do console.');
      setCampaigns([]);
      setAccountInfo(null);
      setLastSync(null);
    } finally {
      setLoading(false);
    }
  }, [hasConnectedIntegrations, dateRange.since, dateRange.until]);

  // Função para buscar campanhas filtradas (sem sincronizar)
  const loadFilteredCampaigns = useCallback(async () => {
    if (!hasConnectedIntegrations || !initialLoadComplete) {
      console.log('⚠️ Não há integrações ou carregamento inicial não concluído');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Buscando campanhas para o período ${dateRange.since} até ${dateRange.until}...`);
      const { data: campaignsData, error: campaignsError } = await supabase.functions.invoke('get-campaigns', {
        body: { 
          platform: 'meta',
          date_range: {
            since: dateRange.since,
            until: dateRange.until
          }
        }
      });

      if (campaignsError) {
        console.error('❌ Erro ao buscar campanhas:', campaignsError);
        throw new Error(`Erro ao buscar campanhas: ${campaignsError.message || 'Erro desconhecido'}`);
      }

      if (!campaignsData || !campaignsData.success) {
        console.error('❌ Resposta inválida:', campaignsData);
        throw new Error('Resposta inválida da função get-campaigns');
      }

      const campaigns = campaignsData.campaigns || [];
      console.log(`✅ Campanhas encontradas para o período: ${campaigns.length}`);
      setCampaigns(campaigns);
      
      if (campaigns.length === 0) {
        setError('Nenhuma campanha encontrada para o período selecionado.');
      }
    } catch (error) {
      console.error('🚫 Erro ao buscar campanhas:', error);
      setError(`Erro ao buscar campanhas: ${error.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [hasConnectedIntegrations, dateRange.since, dateRange.until, initialLoadComplete]);


  // Filtrar campanhas por status
  const filterCampaigns = useCallback((status: string) => {
    if (status === 'todos') {
      setFilteredCampaigns(campaigns);
    } else {
      const filtered = campaigns.filter(campaign => 
        campaign.status.toLowerCase() === status.toLowerCase()
      );
      setFilteredCampaigns(filtered);
    }
    setStatusFilter(status);
  }, [campaigns]);

  // Lidar com mudança de período
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

  // Helper para calcular resultados baseado em actions
  const getResults = (campaign: Campaign) => {
    const insights = campaign.insights?.data?.[0];
    if (!insights || !insights.actions || !campaign.objective) return 0;
    
    const actions = insights.actions;
    let totalResults = 0;
    
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
      default:
        totalResults = actions.reduce((sum, action) => sum + parseInt(action.value), 0);
    }
    
    return totalResults;
  };

  // Helpers de formatação
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

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getObjectiveText = (objective: string) => {
    if (!objective) return 'Objetivo não definido';
    
    switch (objective.toUpperCase()) {
      case 'CONVERSIONS':
        return 'Conversões';
      case 'VIDEO_VIEWS':
        return 'Visualizações de Vídeo';
      case 'OUTCOME_ENGAGEMENT':
        return 'Engajamento';
      case 'OUTCOME_AWARENESS':
        return 'Reconhecimento da Marca';
      case 'OUTCOME_LEADS':
        return 'Geração de Leads';
      default:
        return objective;
    }
  };

  // Effects
  useEffect(() => {
    checkConnectedIntegrations();
  }, [checkConnectedIntegrations]);

  useEffect(() => {
    if (hasConnectedIntegrations && !initialLoadComplete) {
      setInitialLoadComplete(true);
      syncRealCampaigns();
    } else if (!hasConnectedIntegrations && !initialLoadComplete) {
      setInitialLoadComplete(true);
      setCampaigns([]);
      setAccountInfo(null);
      setLastSync(null);
      setError('Nenhuma integração Meta conectada. Conecte uma conta para visualizar campanhas reais.');
    }
  }, [hasConnectedIntegrations, initialLoadComplete, syncRealCampaigns]);

  // Recarregar campanhas quando o período muda (mas só filtra dados existentes)
  useEffect(() => {
    if (initialLoadComplete && hasConnectedIntegrations) {
      loadFilteredCampaigns();
    }
  }, [dateRange.since, dateRange.until, hasConnectedIntegrations, initialLoadComplete, loadFilteredCampaigns]);

  useEffect(() => {
    filterCampaigns(statusFilter);
  }, [campaigns, statusFilter, filterCampaigns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando campanhas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Campanhas do Meta Ads</h2>
          {accountInfo && (
            <p className="text-sm text-gray-600">
              Conta: {accountInfo.name} (ID: {accountInfo.id})
            </p>
          )}
          {lastSync && (
            <p className="text-xs text-gray-500">
              Última sincronização: {format(new Date(lastSync), 'dd/MM/yyyy às HH:mm', { locale: ptBR })}
            </p>
          )}
          <div className="flex items-center space-x-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${hasConnectedIntegrations ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-medium ${hasConnectedIntegrations ? 'text-green-600' : 'text-red-600'}`}>
              {hasConnectedIntegrations 
                ? `✅ SINCRONIZAÇÃO REAL: ${integrations.length} integração(ões) conectada(s)`
                : '⚠️ SEM INTEGRAÇÕES: Exibindo dados de demonstração'
              }
            </span>
          </div>
        </div>
        <Button 
          onClick={() => syncRealCampaigns()} 
          disabled={loading}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Recarregar
        </Button>
      </div>

      {/* Seletor de Período */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Período:</span>
        </div>
        
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
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

        <span className="text-gray-400">ou</span>

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

        <div className="text-sm text-gray-600">
          {format(new Date(dateRange.since), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(dateRange.until), 'dd/MM/yyyy', { locale: ptBR })}
        </div>
      </div>

      {/* Filtros por status */}
      <div className="flex space-x-2">
        {['todos', 'active', 'paused'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => filterCampaigns(status)}
            className="flex items-center space-x-1"
          >
            <span>
              {status === 'todos' ? 'Todas' : 
               status === 'active' ? 'Ativas' : 
               'Pausadas'}
            </span>
            <Badge variant="secondary" className="ml-1">
              {status === 'todos' ? campaigns.length :
               campaigns.filter(c => c.status.toLowerCase() === status).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Aviso</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Campanhas */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Nenhuma campanha encontrada para o filtro selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(campaign.status)}
                      <span className="text-sm text-gray-600">
                        {getObjectiveText(campaign.objective || '')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Criada em: {campaign.start_date ? format(new Date(campaign.start_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Data não disponível'}
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
                      <p className="text-xs text-gray-500">Gasto</p>
                      <p className="font-semibold">
                        {campaign.insights?.data?.[0]?.spend ? formatCurrency(campaign.insights.data[0].spend) : 'R$ 0,00'}
                      </p>
                    </div>
                  </div>

                  {/* Impressões */}
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Impressões</p>
                      <p className="font-semibold">
                        {campaign.insights?.data?.[0]?.impressions ? formatNumber(parseInt(campaign.insights.data[0].impressions)) : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Cliques */}
                  <div className="flex items-center space-x-2">
                    <MousePointer className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-500">Cliques</p>
                      <p className="font-semibold">
                        {campaign.insights?.data?.[0]?.clicks ? formatNumber(parseInt(campaign.insights.data[0].clicks)) : '0'}
                      </p>
                    </div>
                  </div>

                  {/* CTR */}
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-500">CTR</p>
                      <p className="font-semibold">
                        {campaign.insights?.data?.[0]?.ctr ? parseFloat(campaign.insights.data[0].ctr).toFixed(2) + '%' : '0.00%'}
                      </p>
                    </div>
                  </div>

                  {/* CPM */}
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-xs text-gray-500">CPM</p>
                      <p className="font-semibold">
                        {campaign.insights?.data?.[0]?.cpm ? formatCurrency(campaign.insights.data[0].cpm) : 'R$ 0,00'}
                      </p>
                    </div>
                  </div>

                  {/* CPC */}
                  <div className="flex items-center space-x-2">
                    <MousePointer className="h-4 w-4 text-pink-600" />
                    <div>
                      <p className="text-xs text-gray-500">CPC</p>
                      <p className="font-semibold">
                        {campaign.insights?.data?.[0]?.cpc ? formatCurrency(campaign.insights.data[0].cpc) : 'R$ 0,00'}
                      </p>
                    </div>
                  </div>

                  {/* Alcance */}
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs text-gray-500">Alcance</p>
                      <p className="font-semibold">
                        {campaign.insights?.data?.[0]?.reach ? formatNumber(parseInt(campaign.insights.data[0].reach)) : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Resultados (prioridade principal) */}
                  <div className="flex items-center space-x-2 bg-green-50 p-2 rounded border border-green-200">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-green-700 font-medium">Resultados</p>
                      <p className="font-bold text-green-800">
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

export default MetaCampaignsFixed;
