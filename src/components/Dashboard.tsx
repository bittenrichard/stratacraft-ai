import React from 'react';
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
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Users, 
  MousePointer,
  Play,
  Pause,
  Copy,
  Plus,
  Brain,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  // Dados simulados para demonstração
  const kpiData = [
    { name: 'CPA', value: 'R$ 45,30', change: -12.5, isPositive: true },
    { name: 'ROI', value: '340%', change: 23.1, isPositive: true },
    { name: 'ROAS', value: '4.2x', change: 8.7, isPositive: true },
    { name: 'CTR', value: '2.85%', change: -2.3, isPositive: false },
  ];

  const campaignData = [
    { name: 'Jan', metaAds: 45000, googleAds: 38000 },
    { name: 'Fev', metaAds: 52000, googleAds: 42000 },
    { name: 'Mar', metaAds: 48000, googleAds: 45000 },
    { name: 'Abr', metaAds: 61000, googleAds: 48000 },
    { name: 'Mai', metaAds: 55000, googleAds: 52000 },
    { name: 'Jun', metaAds: 67000, googleAds: 58000 },
  ];

  const topCampaigns = [
    { name: 'Campanha Black Friday', platform: 'Meta', spend: 'R$ 12.450', roas: '5.2x', status: 'active' },
    { name: 'Google Search - Produtos', platform: 'Google', spend: 'R$ 8.790', roas: '3.8x', status: 'active' },
    { name: 'Retargeting Carrinho', platform: 'Meta', spend: 'R$ 5.230', roas: '6.1x', status: 'active' },
    { name: 'Display Conscientização', platform: 'Google', spend: 'R$ 3.450', roas: '2.1x', status: 'paused' },
  ];

  const aiSuggestions = [
    {
      type: 'warning',
      title: 'Campanha com CPA alto detectada',
      description: 'Black Friday Meta está 30% acima da meta. Recomendo pausar audiências lookalike.',
      action: 'Otimizar'
    },
    {
      type: 'success',
      title: 'Oportunidade de escala',
      description: 'Retargeting Carrinho com ROAS 6.1x. Aumentar orçamento em 50%.',
      action: 'Escalar'
    },
    {
      type: 'info',
      title: 'Novo teste criativo sugerido',
      description: 'IA gerou variação de copy para teste A/B na campanha principal.',
      action: 'Revisar'
    }
  ];

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
              <BarChart data={campaignData}>
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
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="border border-border rounded-lg p-3 bg-muted/50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">{suggestion.title}</h4>
                  <Badge variant={suggestion.type === 'warning' ? 'destructive' : 
                                suggestion.type === 'success' ? 'default' : 'secondary'}>
                    {suggestion.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{suggestion.description}</p>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  {suggestion.action}
                </Button>
              </div>
            ))}
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
                <Play className="h-4 w-4 mr-2" />
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
            {topCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-4">
                  <Badge variant={campaign.platform === 'Meta' ? 'default' : 'secondary'}>
                    {campaign.platform}
                  </Badge>
                  <div>
                    <h3 className="font-medium text-foreground">{campaign.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Gasto: {campaign.spend} • ROAS: {campaign.roas}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={campaign.status === 'active' ? 'default' : 'destructive'}>
                    {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
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