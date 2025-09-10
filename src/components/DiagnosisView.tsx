import React, { useState, useEffect } from 'react';
// CORREÇÃO: Adicionamos o 'CardFooter' que estava faltando na importação abaixo
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Lightbulb, Zap, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

const questions = [
  {
    step: 1,
    title: "Sobre seu Negócio",
    fields: [
      { name: "businessName", label: "Qual o nome da sua empresa?", type: "text" },
      { name: "businessDescription", label: "Descreva seu negócio em poucas frases.", type: "textarea" },
      { name: "mainProducts", label: "Quais são seus principais produtos ou serviços?", type: "textarea" },
    ],
  },
  {
    step: 2,
    title: "Público-Alvo",
    fields: [
      { name: "targetAudience", label: "Quem é seu cliente ideal? (idade, gênero, interesses, etc.)", type: "textarea" },
      { name: "customerPainPoints", label: "Quais problemas do seu cliente você resolve?", type: "textarea" },
    ],
  },
  {
    step: 3,
    title: "Metas e Objetivos",
    fields: [
      { name: "mainGoal", label: "Qual é o principal objetivo com o marketing digital nos próximos 6 meses?", type: "text" },
      { name: "monthlyRevenue", label: "Qual seu faturamento mensal atual (aproximado)?", type: "text" },
      { name: "revenueGoal", label: "Qual a meta de faturamento mensal em 6 meses?", type: "text" },
    ],
  },
];

const DiagnosisView = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [actionPlan, setActionPlan] = useState<any | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, questions.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    setIsLoading(true);
    toast({ title: "Analisando suas respostas...", description: "Nossa IA está gerando seu plano de ação." });

    try {
      // Simulação da chamada para a Edge Function que geraria o plano
      setTimeout(() => {
        const simulatedPlan = {
          recommendedPlatforms: ["Meta Ads", "Google Ads"],
          suggestedBudgets: { daily: 100, monthly: 3000 },
          suggestedCampaigns: [
            "Campanha de Reconhecimento no Instagram (Topo de Funil)",
            "Campanha de Captura de Leads no Facebook (Meio de Funil)",
            "Campanha de Pesquisa no Google para palavras-chave de fundo de funil"
          ],
          strategicPillars: [
            "Foco em conteúdo de vídeo para Reels e Stories.",
            "Criar uma isca digital (e-book) para captura de leads.",
            "Otimizar o SEO local para o Google Meu Negócio."
          ]
        };
        setActionPlan(simulatedPlan);
        setIsLoading(false);
        toast({ title: "Seu Plano de Ação está pronto!" });
      }, 3000);

    } catch (error: any) {
      setIsLoading(false);
      toast({ title: "Erro ao gerar plano", description: error.message, variant: "destructive" });
    }
  };

  if (actionPlan) {
    return (
       <div className="min-h-screen bg-gradient-subtle p-6">
         <Button onClick={() => setActionPlan(null)} variant="outline" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4"/> Voltar ao Diagnóstico</Button>
         <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="text-primary"/>Seu Plano de Ação Estratégico</CardTitle>
                <CardDescription>Baseado em suas respostas, nossa IA recomenda os seguintes passos para os próximos 6 meses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Plataformas Recomendadas</h3>
                    <div className="flex gap-2">{actionPlan.recommendedPlatforms.map((p:string) => <Badge key={p}>{p}</Badge>)}</div>
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Orçamento Sugerido</h3>
                    <p className="text-sm">Diário: R$ {actionPlan.suggestedBudgets.daily},00 | Mensal: R$ {actionPlan.suggestedBudgets.monthly},00</p>
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Tipos de Campanhas Iniciais</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">{actionPlan.suggestedCampaigns.map((c:string) => <li key={c}>{c}</li>)}</ul>
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Pilares Estratégicos</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">{actionPlan.strategicPillars.map((p:string) => <li key={p}>{p}</li>)}</ul>
                </div>
            </CardContent>
         </Card>
       </div>
    );
  }

  const currentQuestionSet = questions.find(q => q.step === currentStep);
  const progress = (currentStep / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-gradient-card border-border shadow-card">
        <CardHeader>
          <Progress value={progress} className="mb-4" />
          <CardTitle>Diagnóstico Estratégico ({currentStep}/{questions.length})</CardTitle>
          <CardDescription>{currentQuestionSet?.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestionSet?.fields.map(field => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea id={field.name} name={field.name} onChange={handleInputChange} />
              ) : (
                <Input id={field.name} name={field.name} type={field.type} onChange={handleInputChange} />
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          {currentStep < questions.length ? (
            <Button onClick={nextStep}>Próximo</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading} className="bg-gradient-primary">
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Lightbulb className="mr-2 h-4 w-4"/>}
              Gerar Plano de Ação
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default DiagnosisView;