import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Copy,
  Plus,
  Brain,
  Calendar,
  Target,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type Campaign = Tables<'campaigns'>;

const Dashboard = () => {
  const [topCampaigns, setTopCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTopCampaigns();
  }, []);

  const fetchTopCampaigns = async () => {
    setLoading(true);
    try {
      // Busca as 4 campanhas mais recentes
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      setTopCampaigns(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar campanhas do dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Dados de KPI e gráficos ainda como placeholders, pois dependem de métricas externas
  const kpiData = [
    { name: 'CPA', value: 'R$ 0,00', change: 0, isPositive: true },
    { name: 'ROI', value: '0%', change: 0, isPositive: true },
    { name: 'ROAS', value: '0.0x', change: 0, isPositive: true },
    { name: 'CTR', value: '0.00%', change: 0, isPositive: false },
  ];

  const campaignChartData = [
    { name: 'Jan', metaAds: 0, googleAds: 0 },
    { name: 'Fev', metaAds: 0, googleAds: 0 },
    { name: 'Mar', metaAds: 0, googleAds: 0 },
    { name: 'Abr', metaAds: 0, googleAds: 0 },
    { name: 'Mai', metaAds: 0, googleAds: 0 },
    { name: 'Jun', metaAds: 0, googleAds: 0 },
  ];

  const aiSuggestions = []; // A ser implementado na Fase 4

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Dashboard Unificado
        </h1>
        <p className="text-muted-foreground">
          Centralize todas suas operações de marketing digital em um só lugar
        </p>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="bg-gradient-card border-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.name}
              </CardTitle>
              {kpi.isPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              <p className={`text-xs ${kpi.isPositive ? 'text-success' : 'text-destructive'}`}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}% vs mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Performance Comparison Chart */}
        <Card className="lg:col-span-2 bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Performance Meta Ads vs Google Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Bar dataKey="metaAds" fill="hsl(var(--primary))" radius={4} />
                <Bar dataKey="googleAds" fill="hsl(var(--primary-glow))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              IA Analítica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {aiSuggestions.length > 0 ? aiSuggestions.map((suggestion, index) => (
              <div key={index} className="border border-border rounded-lg p-3 bg-muted/50">
                {/* ... */}
              </div>
            )) : <p className="text-sm text-muted-foreground text-center">Nenhuma sugestão da IA no momento.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card className="bg-gradient-card border-border shadow-card mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Principais Campanhas</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Ações Rápidas
              </Button>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCampaigns.length > 0 ? topCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-4">
                  <Badge variant={campaign.platform === 'meta' ? 'default' : 'secondary'}>
                    {campaign.platform}
                  </Badge>
                  <div>
                    <h3 className="font-medium text-foreground">{campaign.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Gasto: R$ {campaign.budget_amount?.toFixed(2) || '0.00'} • ROAS: 0.0x
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={campaign.status === 'active' ? 'default' : 'destructive'}>
                    {campaign.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center">Nenhuma campanha para exibir.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer">
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">IA Criativa</h3>
            <p className="text-sm text-muted-foreground">
              Crie campanhas completas com copy e criativos automáticos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer">
          <CardContent className="p-6 text-center">
            <Target className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Diagnóstico</h3>
            <p className="text-sm text-muted-foreground">
              Ferramenta de diagnóstico para estratégia personalizada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Calendário</h3>
            <p className="text-sm text-muted-foreground">
              Planejamento inteligente de conteúdo para redes sociais
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;