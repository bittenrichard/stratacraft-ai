import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Brain, Lightbulb, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

// Exemplo de como os dados dos insights poderiam ser
const exampleInsights = [
  {
    id: 1,
    insight_type: 'warning',
    content: "A campanha 'Google Search - Produtos' teve um aumento de 45% no Custo por Clique (CPC) nos últimos 3 dias. Recomenda-se revisar os lances de palavras-chave ou a qualidade dos anúncios."
  },
  {
    id: 2,
    insight_type: 'opportunity',
    content: "O criativo 'video-promo-verao.mp4' na campanha de Instagram Stories está com um CTR 78% acima da média. Considere alocar mais orçamento para este anúncio."
  },
  {
    id: 3,
    insight_type: 'suggestion',
    content: "Seu público entre 25-34 anos demonstrou o maior ROAS no último mês. Considere criar uma campanha de remarketing específica para este segmento."
  }
];

const AnalyticsView = () => {
  const [insights, setInsights] = useState(exampleInsights);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateInsights = () => {
    setLoading(true);
    toast({ title: "Analisando seus dados...", description: "A IA está processando as métricas de suas campanhas para gerar novos insights." });

    // Simulação da chamada para uma Edge Function que usaria a IA
    setTimeout(() => {
      // Aqui, você chamaria a função de backend e atualizaria o estado 'insights' com a resposta.
      // supabase.functions.invoke('generate-insights')
      toast({ title: "Novos insights gerados!" });
      setLoading(false);
    }, 4000);
  };

  const getInsightIcon = (type: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-success" />;
      case 'suggestion':
      default:
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            IA Analítica
          </h1>
          <p className="text-muted-foreground">
            Insights e recomendações automáticas para otimizar seus resultados.
          </p>
        </div>
        <Button onClick={handleGenerateInsights} disabled={loading} className="bg-gradient-primary">
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
          Gerar Novos Insights
        </Button>
      </div>

      <div className="space-y-6">
        {insights.map((insight) => (
          <Card key={insight.id} className="bg-gradient-card border-border shadow-card">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div>{getInsightIcon(insight.insight_type)}</div>
                <div className="flex-1">
                  <Badge variant={insight.insight_type === 'warning' ? 'destructive' : 'secondary'} className="mb-2 capitalize">{insight.insight_type}</Badge>
                  <p className="text-foreground">{insight.content}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline">Ver Detalhes</Button>
                  <Button size="sm" variant="ghost">Ignorar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
         {insights.length === 0 && !loading && (
             <Card className="bg-gradient-card border-border shadow-card">
                 <CardContent className="p-12 text-center">
                     <div className="text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">Pronto para começar?</h3>
                        <p>Clique em "Gerar Novos Insights" para que nossa IA analise suas campanhas e forneça recomendações personalizadas.</p>
                     </div>
                 </CardContent>
             </Card>
         )}
      </div>
    </div>
  );
};

export default AnalyticsView;