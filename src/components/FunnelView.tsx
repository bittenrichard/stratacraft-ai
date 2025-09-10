import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowDown, Users, MousePointer, Star, ShoppingCart, DollarSign, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ptBR } from 'date-fns/locale';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// Tipo para os dados do funil
type FunnelData = {
  visitors: number;
  leads: number;
  opportunities: number;
  sales_count: number;
  total_spend: number;
  sales_value: number;
};

const FunnelView = () => {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchFunnelData(currentMonth);
  }, [currentMonth]);

  const fetchFunnelData = async (month: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      // Busca e agrega os dados da tabela funnel_data para o mês selecionado
      const { data, error } = await supabase
        .from('funnel_data')
        .select('visitors, leads, opportunities, sales_count, total_spend, sales_value')
        .gte('date_key', format(start, 'yyyy-MM-dd'))
        .lte('date_key', format(end, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Agrega os resultados
      const aggregatedData = (data || []).reduce((acc, row) => {
        acc.visitors += row.visitors || 0;
        acc.leads += row.leads || 0;
        acc.opportunities += row.opportunities || 0;
        acc.sales_count += row.sales_count || 0;
        acc.total_spend += row.total_spend || 0;
        acc.sales_value += row.sales_value || 0;
        return acc;
      }, { visitors: 0, leads: 0, opportunities: 0, sales_count: 0, total_spend: 0, sales_value: 0 });

      setFunnelData(aggregatedData);

    } catch (error: any) {
      toast({ title: "Erro ao buscar dados do funil", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular a taxa de conversão entre duas etapas
  const calculateConversionRate = (from: number, to: number) => {
    if (from === 0) return '0.00%';
    return `${((to / from) * 100).toFixed(2)}%`;
  };

  const FunnelStage = ({ icon: Icon, title, value, conversionFrom, conversionTo, color }) => (
    <>
      <Card className={`bg-gradient-card border-border shadow-card relative overflow-hidden`}>
        <div className={`absolute -top-4 -right-4 h-16 w-16 rounded-full ${color} opacity-20`}></div>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={`rounded-lg p-3 ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</CardTitle>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
        </CardHeader>
      </Card>
      {conversionFrom !== undefined && (
        <div className="flex items-center justify-center my-2 text-muted-foreground">
          <ArrowDown className="h-5 w-5 mr-2" />
          <span className="text-sm font-medium">{calculateConversionRate(conversionFrom, conversionTo)}</span>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Funil de Vendas
          </h1>
          <p className="text-muted-foreground">
            Visualize a jornada completa do seu cliente, do clique à conversão.
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchFunnelData(currentMonth)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna do Funil Visual */}
        <div className="flex flex-col items-center">
          {loading ? (
             <p className="text-muted-foreground">Carregando dados do funil...</p>
          ) : funnelData ? (
            <>
              <FunnelStage icon={Users} title="Visitantes" value={funnelData.visitors} color="bg-blue-500" conversionFrom={funnelData.visitors} conversionTo={funnelData.leads} />
              <FunnelStage icon={MousePointer} title="Leads Capturados" value={funnelData.leads} color="bg-indigo-500" conversionFrom={funnelData.leads} conversionTo={funnelData.opportunities} />
              <FunnelStage icon={Star} title="Oportunidades" value={funnelData.opportunities} color="bg-purple-500" conversionFrom={funnelData.opportunities} conversionTo={funnelData.sales_count} />
              <FunnelStage icon={ShoppingCart} title="Vendas" value={funnelData.sales_count} color="bg-pink-500" />
            </>
          ) : (
            <p className="text-muted-foreground">Nenhum dado do funil para exibir.</p>
          )}
        </div>

        {/* Coluna de Métricas e ROI */}
        <div className="space-y-6">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="text-primary"/> Análise Financeira</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Investimento Total (Ads)</span>
                <span className="font-bold text-lg">R$ {funnelData?.total_spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Receita Gerada (Vendas)</span>
                <span className="font-bold text-lg text-success">R$ {funnelData?.sales_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Retorno (ROI)</span>
                <span className="font-bold text-2xl text-success">
                  {funnelData && funnelData.total_spend > 0 
                    ? `${(((funnelData.sales_value - funnelData.total_spend) / funnelData.total_spend) * 100).toFixed(2)}%`
                    : '0.00%'}
                </span>
              </div>
            </CardContent>
          </Card>
           <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="text-primary"/> Custo por Etapa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Custo por Visitante (CPV)</span>
                <span className="font-bold text-lg">
                   R$ {funnelData && funnelData.visitors > 0 ? (funnelData.total_spend / funnelData.visitors).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Custo por Lead (CPL)</span>
                <span className="font-bold text-lg">
                   R$ {funnelData && funnelData.leads > 0 ? (funnelData.total_spend / funnelData.leads).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Custo por Aquisição (CPA)</span>
                <span className="font-bold text-lg">
                   R$ {funnelData && funnelData.sales_count > 0 ? (funnelData.total_spend / funnelData.sales_count).toFixed(2) : '0.00'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FunnelView;