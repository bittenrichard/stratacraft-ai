import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, RefreshCw, TrendingUp, Eye, MousePointer, DollarSign, CalendarIcon, RotateCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  external_id: string;
  name: string;
  status: string;
  objective: string;
  budget_amount: number;
  budget_type: string;
  start_date: string;
  end_date?: string;
  // Métricas diretas (nossa implementação otimizada)
  impressions?: number;
  clicks?: number;
  spend?: number;
  ctr?: number;
  cpm?: number;
  cpc?: number;
  cpp?: number;
  reach?: number;
  conversions?: number;
  // Estrutura original de insights (fallback)
  insights?: {
    data: [{
      spend: string;
      impressions: string;
      clicks: string;
      ctr: string;
      cpc: string;
      cpm: string;
      reach: string;
      actions?: Array<{
        action_type: string;
        value: string;
      }>;
    }];
  };
}

interface AdAccount {
  id: string;
  name: string;
}

interface DateRange {
  since: string;
  until: string;
}

const MetaCampaignsComplete = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para forçar reconexão Meta
  const forceReconnectMeta = () => {
    const appId = '707350985805370';
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
      'attribution_read'
    ].join(',');
    
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: 'code',
      state: 'meta',
      auth_type: 'rerequest' // Força nova autorização
    });
    
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    window.location.href = authUrl;
  };
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    since: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('last_30d');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Função para buscar campanhas do Supabase
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Buscando campanhas...');

      // Buscar integração Meta ativa para obter o access_token
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar integração Meta
      const { data: integrations, error: intError } = await supabase
        .from('ad_integrations')
        .select('*')
        .eq('workspace_id', user.id)
        .eq('platform', 'meta')
        .eq('is_active', true)
        .limit(1);

      if (intError || !integrations || integrations.length === 0) {
        console.log('❌ Nenhuma integração Meta encontrada');
        // Verificar localStorage como fallback
        const localStorageKey = `meta_integration_data_${user.id}`;
        const localData = localStorage.getItem(localStorageKey);
        
        if (!localData) {
          throw new Error('Nenhuma integração Meta encontrada. Conecte sua conta Meta primeiro.');
        }

        const parsedData = JSON.parse(localData);
        if (!parsedData.access_token) {
          throw new Error('Token de acesso não encontrado. Reconecte sua conta Meta.');
        }

        // Usar dados do localStorage
        console.log('📱 Usando dados do localStorage para buscar campanhas');
        
        // Se há uma conta específica selecionada, usar apenas ela
        if (parsedData.selected_account) {
          console.log(`🎯 Usando conta selecionada do localStorage: ${parsedData.selected_account.name} (${parsedData.selected_account.id})`);
          await fetchCampaignsFromMeta(parsedData.access_token, [parsedData.selected_account]);
        } else if (parsedData.ad_accounts && parsedData.ad_accounts.length > 0) {
          // Se não há conta específica, usar a primeira (compatibilidade)
          console.log(`🎯 Usando primeira conta disponível: ${parsedData.ad_accounts[0].name} (${parsedData.ad_accounts[0].id})`);
          await fetchCampaignsFromMeta(parsedData.access_token, [parsedData.ad_accounts[0]]);
        } else {
          throw new Error('Nenhuma conta de anúncios encontrada no localStorage.');
        }
      } else {
        // Usar dados do banco
        const integration = integrations[0];
        console.log('🏦 Usando dados do banco para buscar campanhas');
        
        // Usar APENAS a conta específica selecionada na integração
        const selectedAccount = {
          id: integration.account_id,
          name: integration.account_name || integration.account_id
        };
        
        console.log(`🎯 Buscando campanhas apenas da conta selecionada: ${selectedAccount.name} (${selectedAccount.id})`);
        
        await fetchCampaignsFromMeta(integration.access_token, [selectedAccount]);
      }

    } catch (error) {
      console.error('❌ Erro ao buscar campanhas:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampaignsFromMeta = async (accessToken: string, adAccounts: AdAccount[]) => {
    try {
      console.log('🔍 Buscando campanhas via Meta API direta...');
      
      // Primeiro, verificar se o token é válido
      console.log('🔐 Verificando validade do token...');
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v19.0/me?access_token=${accessToken}&fields=id,name`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.text();
        console.error('❌ Token inválido ou expirado:', tokenResponse.status, tokenError);
        
        if (tokenResponse.status === 401) {
          throw new Error('Token de acesso expirado. Por favor, reconecte sua conta Meta.');
        } else if (tokenResponse.status === 403) {
          throw new Error('Token de acesso sem permissões necessárias. Por favor, reconecte sua conta Meta.');
        } else {
          throw new Error('Erro de autenticação com Meta. Por favor, reconecte sua conta.');
        }
      }

      const tokenData = await tokenResponse.json();
      console.log('✅ Token válido para usuário:', tokenData.name);
      
      if (!adAccounts || adAccounts.length === 0) {
        console.log('❌ Nenhuma conta de anúncios encontrada');
        setCampaigns([]);
        return;
      }

      let allCampaigns: Campaign[] = [];

      // Buscar campanhas de cada conta de anúncios
      for (const adAccount of adAccounts) {
        // Garantir que o ID não tenha prefixo 'act_' duplicado
        const accountId = adAccount.id.startsWith('act_') ? adAccount.id.replace('act_', '') : adAccount.id;
        
        try {
          console.log(`📊 Buscando campanhas da conta: ${adAccount.name} (${accountId})`);
          
          // Primeiro, verificar se o usuário tem acesso à conta
          const fullAccountId = `act_${accountId}`;
          
          const accountResponse = await fetch(
            `https://graph.facebook.com/v19.0/${fullAccountId}?access_token=${accessToken}&fields=id,name,account_status,business_country_code`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          if (!accountResponse.ok) {
            const accountError = await accountResponse.text();
            console.error(`❌ Erro ao acessar conta ${accountId}:`, accountResponse.status, accountError);
            
            if (accountResponse.status === 403) {
              console.error(`❌ Sem permissão para acessar a conta ${accountId}. Verifique se o token tem as permissões: ads_read, ads_management`);
            }
            continue;
          }

          const accountData = await accountResponse.json();
          console.log(`✅ Acesso confirmado à conta: ${accountData.name} (Status: ${accountData.account_status})`);
          
          // Agora buscar as campanhas com campos mais básicos
          const response = await fetch(
            `https://graph.facebook.com/v19.0/${fullAccountId}/campaigns?access_token=${accessToken}&fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time&limit=25`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro ao buscar campanhas da conta ${accountId}:`, response.status, errorText);
            
            if (response.status === 403) {
              console.error(`❌ Sem permissão para listar campanhas da conta ${accountId}. Verifique se o token tem a permissão: ads_read`);
            }
            continue;
          }

          const data = await response.json();
          
          if (data.data && Array.isArray(data.data)) {
            console.log(`📊 ${data.data.length} campanhas encontradas na conta ${adAccount.name}`);
            
            // Buscar métricas em paralelo para todas as campanhas de uma só vez
            const campaignInsightsPromises = data.data.map(async (campaign) => {
              let metrics = {
                impressions: 0,
                clicks: 0,
                spend: 0,
                ctr: 0,
                cpm: 0,
                cpp: 0,
                reach: 0,
                conversions: 0
              };

              try {
                const insightsResponse = await fetch(
                  `https://graph.facebook.com/v19.0/${campaign.id}/insights?access_token=${accessToken}&fields=impressions,clicks,spend,ctr,cpm,reach,actions,video_views&date_preset=last_30d`,
                  {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                  }
                );

                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  
                  if (insightsData.data && insightsData.data.length > 0) {
                    const insight = insightsData.data[0];
                    
                    // Priorizar RESULTADOS - buscar todas as possíveis conversões
                    let conversions = 0;
                    if (insight.actions) {
                      const resultActions = insight.actions.filter(action => 
                        ['purchase', 'lead', 'complete_registration', 'submit_application', 
                         'add_to_cart', 'initiate_checkout', 'add_payment_info', 'contact',
                         'subscribe', 'start_trial', 'app_install'].includes(action.action_type)
                      );
                      conversions = resultActions.reduce((sum, action) => sum + parseInt(action.value || 0), 0);
                    }
                    
                    metrics = {
                      impressions: parseInt(insight.impressions) || 0,
                      clicks: parseInt(insight.clicks) || 0,
                      spend: parseFloat(insight.spend) || 0,
                      ctr: parseFloat(insight.ctr) || 0,
                      cpm: parseFloat(insight.cpm) || 0,
                      cpc: parseFloat(insight.spend) && parseInt(insight.clicks) ? 
                           parseFloat(insight.spend) / parseInt(insight.clicks) : 0,
                      cpp: parseFloat(insight.cpp) || 0,
                      reach: parseInt(insight.reach) || 0,
                      conversions: conversions
                    };
                  }
                }
              } catch (error) {
                console.log(`⚠️ Erro ao buscar métricas para ${campaign.name}:`, error);
              }

              return {
                id: campaign.id,
                external_id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                budget_amount: campaign.daily_budget || campaign.lifetime_budget || 0,
                budget_type: campaign.daily_budget ? 'daily' : 'lifetime',
                start_date: campaign.start_time,
                end_date: campaign.stop_time,
                created_at: campaign.created_time,
                updated_at: campaign.updated_time,
                account_id: accountId,
                account_name: adAccount.name,
                platform: 'meta',
                ...metrics
              };
            });

            // Aguardar todas as promessas em paralelo (mais rápido)
            const campaignsWithMetrics = await Promise.all(campaignInsightsPromises);
            
            allCampaigns = allCampaigns.concat(campaignsWithMetrics);
            console.log(`✅ ${campaignsWithMetrics.length} campanhas processadas com métricas na conta ${adAccount.name}`);
          }

        } catch (accountError) {
          console.error(`❌ Erro ao processar conta ${accountId}:`, accountError);
          continue;
        }
      }

      console.log(`🎯 Total de ${allCampaigns.length} campanhas carregadas`);
      console.log('📊 Campanhas carregadas:', allCampaigns.map(c => ({ 
        name: c.name, 
        status: c.status, 
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions
      })));
      setCampaigns(allCampaigns);

    } catch (error) {
      console.error('❌ Erro ao buscar campanhas da Meta API:', error);
      throw error;
    }
  };

  // Função para sincronizar campanhas
  const syncCampaigns = useCallback(async () => {
    setSyncing(true);
    try {
      await fetchCampaigns();
      toast({
        title: "Campanhas sincronizadas!",
        description: "Dados atualizados com sucesso.",
      });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }, [fetchCampaigns, toast]);

  // Filtrar campanhas por status - simplificado e otimizado
  const filteredCampaigns = React.useMemo(() => {
    if (statusFilter === 'all') return campaigns;
    
    return campaigns.filter(campaign => {
      const status = campaign.status?.toLowerCase();
      
      // Mapeamento direto e simples
      switch (statusFilter) {
        case 'active':
          return status === 'active';
        case 'paused':
          return status === 'paused';
        case 'archived':
          return status === 'archived' || status === 'deleted';
        case 'draft':
          return status === 'in_process' || status === 'with_issues' || status === 'draft';
        default:
          return false;
      }
    });
  }, [campaigns, statusFilter]);

  // Aplicar presets de data
  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let since: Date;
    let until: Date = today;

    switch (preset) {
      case 'today':
        since = today;
        break;
      case 'yesterday':
        since = subDays(today, 1);
        until = subDays(today, 1);
        break;
      case 'last_7d':
        since = subDays(today, 7);
        break;
      case 'last_14d':
        since = subDays(today, 14);
        break;
      case 'last_30d':
        since = subDays(today, 30);
        break;
      case 'last_90d':
        since = subDays(today, 90);
        break;
      default:
        since = subDays(today, 30);
    }

    setDateRange({
      since: format(since, 'yyyy-MM-dd'),
      until: format(until, 'yyyy-MM-dd')
    });
    setSelectedPreset(preset);
    setShowCustomDate(false);
  };

  // Obter métricas de uma campanha
  const getCampaignMetrics = (campaign: Campaign) => {
    const defaultMetrics = {
      spend: '0',
      impressions: '0',
      clicks: '0',
      ctr: '0',
      cpc: '0',
      cpm: '0',
      reach: '0',
      conversions: '0'
    };

    // Verificar se as métricas estão diretamente no objeto da campanha (nossa implementação)
    if (campaign.impressions !== undefined || campaign.spend !== undefined) {
      return {
        spend: String(campaign.spend || 0),
        impressions: String(campaign.impressions || 0),
        clicks: String(campaign.clicks || 0),
        ctr: String(campaign.ctr || 0),
        cpc: String(campaign.cpc || 0),
        cpm: String(campaign.cpm || 0),
        reach: String(campaign.reach || 0),
        conversions: String(campaign.conversions || 0)
      };
    }

    // Fallback para estrutura de insights (se existir)
    if (!campaign.insights?.data?.[0]) return defaultMetrics;

    const insight = campaign.insights.data[0];
    const conversions = insight.actions?.find(action => 
      action.action_type === 'purchase' || action.action_type === 'lead'
    )?.value || '0';

    return {
      spend: insight.spend || '0',
      impressions: insight.impressions || '0',
      clicks: insight.clicks || '0',
      ctr: insight.ctr || '0',
      cpc: insight.cpc || '0',
      cpm: insight.cpm || '0',
      reach: insight.reach || '0',
      conversions
    };
  };

  // Formatar valores monetários
  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue || 0);
  };

  // Formatar números
  const formatNumber = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR').format(numValue || 0);
  };

  // Badge de status
  const getStatusBadge = (status: string) => {
    // Mapear status do Meta para exibição (incluindo mais variações)
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      'ACTIVE': { label: 'Ativa', variant: 'default' },
      'PAUSED': { label: 'Pausada', variant: 'secondary' },
      'ARCHIVED': { label: 'Arquivada', variant: 'outline' },
      'DELETED': { label: 'Deletada', variant: 'destructive' },
      'IN_PROCESS': { label: 'Em Processo', variant: 'secondary' },
      'WITH_ISSUES': { label: 'Com Problemas', variant: 'destructive' },
      // Variações em minúsculo
      'active': { label: 'Ativa', variant: 'default' },
      'paused': { label: 'Pausada', variant: 'secondary' },
      'archived': { label: 'Arquivada', variant: 'outline' },
      'deleted': { label: 'Deletada', variant: 'destructive' },
      'in_process': { label: 'Em Processo', variant: 'secondary' },
      'with_issues': { label: 'Com Problemas', variant: 'destructive' }
    };

    const config = statusMap[status] || { label: status || 'Desconhecido', variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Carregar campanhas na inicialização
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Carregando campanhas Meta...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Campanhas Meta</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie suas campanhas do Meta Ads com dados em tempo real
          </p>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Última atualização: {format(new Date(lastSync), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={fetchCampaigns} 
            variant="outline" 
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            onClick={syncCampaigns} 
            disabled={syncing}
            size="sm"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </div>
      </div>

      {/* Mensagem de erro com informações sobre permissões */}
      {error && (error.includes('403') || error.includes('ads_management') || error.includes('ads_read')) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-3">
                <h3 className="font-medium text-yellow-800">❌ Permissões Insuficientes para Meta Ads</h3>
                
                <div className="text-sm text-yellow-700 space-y-2">
                  <p className="font-medium">🔍 <strong>Diagnóstico:</strong> A conta Meta não concedeu as permissões necessárias.</p>
                  
                  <div className="bg-yellow-100 p-3 rounded-md">
                    <p className="font-medium mb-2">📋 <strong>Permissões Necessárias:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li><code className="bg-yellow-200 px-1 rounded">ads_management</code> - Para gerenciar anúncios</li>
                      <li><code className="bg-yellow-200 px-1 rounded">ads_read</code> - Para ler dados de campanhas</li>
                      <li><code className="bg-yellow-200 px-1 rounded">business_management</code> - Para acessar Business Manager</li>
                    </ul>
                  </div>

                  <div className="bg-blue-100 p-3 rounded-md">
                    <p className="font-medium mb-2">🔧 <strong>Como resolver:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Vá para a aba <strong>"Integrações"</strong></li>
                      <li>Clique em <strong>"Desconectar"</strong> na integração Meta</li>
                      <li>Clique em <strong>"Conectar Meta"</strong> novamente</li>
                      <li>⚠️ <strong>IMPORTANTE:</strong> Na tela do Facebook, certifique-se de <strong>aceitar TODAS as permissões</strong> solicitadas</li>
                      <li>Não desmarque nenhuma permissão durante a autorização</li>
                    </ol>
                  </div>

                  <div className="bg-red-100 p-3 rounded-md">
                    <p className="font-medium mb-2">⚠️ <strong>Nota Importante:</strong></p>
                    <p className="text-xs">
                      Se você é <strong>administrador da conta de anúncios</strong>, você precisa conceder essas permissões. 
                      Se não é, peça para o administrador da conta te dar acesso com as permissões corretas no Business Manager.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://business.facebook.com', '_blank')}
                    className="text-xs"
                  >
                    🏢 Abrir Business Manager
                  </Button>
                  <Button
                    size="sm"
                    onClick={forceReconnectMeta}
                    className="text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    🔄 Reconectar Meta Agora
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Salvar a aba para abrir depois
                      localStorage.setItem('openTab', 'integrations');
                      window.location.reload();
                    }}
                    className="text-xs"
                  >
                    ⚙️ Ir para Integrações
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem de erro geral */}
      {error && !error.includes('403') && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Erro ao carregar campanhas</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="archived">Arquivada</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preset de Período */}
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={selectedPreset} onValueChange={applyDatePreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="last_14d">Últimos 14 dias</SelectItem>
                  <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="last_90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período Personalizado */}
            <div>
              <label className="text-sm font-medium mb-2 block">Período Personalizado</label>
              <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => {
                      setSelectedPreset('custom');
                      setShowCustomDate(true);
                    }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {`${format(new Date(dateRange.since), 'dd/MM/yyyy')} - ${format(new Date(dateRange.until), 'dd/MM/yyyy')}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">De:</label>
                        <input
                          type="date"
                          value={dateRange.since}
                          onChange={(e) => setDateRange(prev => ({ ...prev, since: e.target.value }))}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Até:</label>
                        <input
                          type="date"
                          value={dateRange.until}
                          onChange={(e) => setDateRange(prev => ({ ...prev, until: e.target.value }))}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        setShowCustomDate(false);
                        fetchCampaigns();
                      }}
                      className="w-full"
                    >
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem de Erro */}
      {error && (
        <Card className={error.includes('exemplo') ? 'border-orange-200 bg-orange-50' : 'border-destructive'}>
          <CardContent className="pt-6">
            <div className={`flex items-center space-x-2 ${error.includes('exemplo') ? 'text-orange-600' : 'text-destructive'}`}>
              <span>{error.includes('exemplo') ? '⚠️' : '❌'}</span>
              <span>{error}</span>
            </div>
            {error.includes('exemplo') && (
              <div className="mt-3 text-sm text-orange-700">
                <p><strong>Para usar dados reais:</strong></p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Acesse a seção "Integrações"</li>
                  <li>Configure sua conta Meta Ads</li>
                  <li>Volte aqui e clique em "Sincronizar"</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Campanhas */}
      <div className="grid gap-4">
        {filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                {campaigns.length === 0 
                  ? 'Nenhuma campanha encontrada. Clique em "Sincronizar" para buscar suas campanhas do Meta.' 
                  : 'Nenhuma campanha encontrada com os filtros aplicados.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => {
            const metrics = getCampaignMetrics(campaign);
            
            return (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {campaign.objective} • Orçamento: {campaign.budget_type === 'daily' ? 'Diário' : 'Vitalício'} {formatCurrency(campaign.budget_amount)}
                      </p>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-600 mb-1">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(metrics.spend)}</p>
                      <p className="text-xs text-muted-foreground">Gasto</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center text-blue-600 mb-1">
                        <Eye className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold">{formatNumber(metrics.impressions)}</p>
                      <p className="text-xs text-muted-foreground">Impressões</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center text-purple-600 mb-1">
                        <MousePointer className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold">{formatNumber(metrics.clicks)}</p>
                      <p className="text-xs text-muted-foreground">Cliques</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center text-orange-600 mb-1">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold">{parseFloat(metrics.ctr).toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground">CTR</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatCurrency(metrics.cpc)}</p>
                      <p className="text-xs text-muted-foreground">CPC</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatCurrency(metrics.cpm)}</p>
                      <p className="text-xs text-muted-foreground">CPM</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatNumber(metrics.reach)}</p>
                      <p className="text-xs text-muted-foreground">Alcance</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center text-green-600 mb-1">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold">{formatNumber(metrics.conversions)}</p>
                      <p className="text-xs text-muted-foreground">Resultados</p>
                    </div>
                  </div>
                  
                  {campaign.start_date && (
                    <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                      <span>Início: {format(new Date(campaign.start_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      {campaign.end_date && (
                        <span> • Fim: {format(new Date(campaign.end_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Resumo */}
      {filteredCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    filteredCampaigns.reduce((sum, campaign) => {
                      const metrics = getCampaignMetrics(campaign);
                      return sum + parseFloat(metrics.spend);
                    }, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Gasto Total</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(
                    filteredCampaigns.reduce((sum, campaign) => {
                      const metrics = getCampaignMetrics(campaign);
                      return sum + parseInt(metrics.impressions);
                    }, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Impressões Totais</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(
                    filteredCampaigns.reduce((sum, campaign) => {
                      const metrics = getCampaignMetrics(campaign);
                      return sum + parseInt(metrics.clicks);
                    }, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Cliques Totais</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(
                    filteredCampaigns.reduce((sum, campaign) => {
                      const metrics = getCampaignMetrics(campaign);
                      return sum + parseInt(metrics.conversions);
                    }, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Resultados Totais</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{filteredCampaigns.length}</p>
                <p className="text-sm text-muted-foreground">Campanhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetaCampaignsComplete;
