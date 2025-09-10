import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Sparkles, Copy, Download, Play, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreativeResult {
  title: string;
  platform: string;
  copy: string;
  targeting: string;
  keywords?: string[];
  predicted_results: {
    reach: string;
    ctr: string;
    cpa: string;
  };
}

const AICreative = () => {
  const [formData, setFormData] = useState({
    platform: 'meta',
    product: '',
    objective: '',
    budget: '',
    audience: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreativeResult | null>(null);
  const { toast } = useToast();

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateCampaign = async () => {
    if (!formData.platform || !formData.product || !formData.objective || !formData.budget) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    toast({ title: "Gerando campanha com IA...", description: "Isso pode levar alguns segundos." });
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-creative', {
        body: formData,
      });

      if (error) throw error;
      
      setResult(data);
      toast({ title: "Campanha gerada com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao gerar campanha", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          IA Criativa
        </h1>
        <p className="text-muted-foreground">
          Crie campanhas completas automaticamente com inteligência artificial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Campaign Generator */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerador de Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Plataforma *</Label>
              <Select value={formData.platform} onValueChange={(value) => handleInputChange('platform', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta Ads (Facebook/Instagram)</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="linkedin">LinkedIn Ads</SelectItem>
                  <SelectItem value="tiktok">TikTok Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Produto/Serviço *</Label>
              <Input placeholder="Ex: Curso de marketing digital, Loja de roupas..." value={formData.product} onChange={(e) => handleInputChange('product', e.target.value)} />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Objetivo da Campanha *</Label>
              <Select value={formData.objective} onValueChange={(value) => handleInputChange('objective', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversions">Vendas / Conversões</SelectItem>
                  <SelectItem value="traffic">Tráfego para o site</SelectItem>
                  <SelectItem value="awareness">Reconhecimento de Marca</SelectItem>
                  <SelectItem value="leads">Geração de Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Orçamento Diário (R$) *</Label>
              <Input placeholder="Ex: 100" type="number" value={formData.budget} onChange={(e) => handleInputChange('budget', e.target.value)} />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Público-Alvo (opcional)</Label>
              <Textarea placeholder="Descreva seu público ideal: idade, interesses, comportamentos..." rows={3} value={formData.audience} onChange={(e) => handleInputChange('audience', e.target.value)} />
            </div>

            <Button className="w-full bg-gradient-primary" onClick={handleGenerateCampaign} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Gerar Campanha com IA
            </Button>
          </CardContent>
        </Card>

        {/* Campaign Preview */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Preview da Campanha Gerada</CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <div className="border border-border rounded-lg p-4 bg-muted/30 min-h-[400px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure os parâmetros e clique em "Gerar Campanha"</p>
                  <p className="text-xs mt-2">A IA criará copy, segmentação e estrutura automaticamente</p>
                </div>
              </div>
            )}
            {loading && (
                 <div className="border border-border rounded-lg p-4 bg-muted/30 min-h-[400px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                        <p>Gerando sua campanha...</p>
                    </div>
                </div>
            )}
            {result && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{result.title}</h3>
                  <Badge variant="secondary" className="mt-1">{result.platform}</Badge>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Copy Gerado</h4>
                    <div className="bg-background/50 rounded-lg p-3 border border-border">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{result.copy}</p>
                    </div>
                </div>
                 <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Segmentação</h4>
                    <p className="text-sm text-muted-foreground">{result.targeting}</p>
                </div>
                {result.keywords && result.keywords.length > 0 && (
                     <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Palavras-chave</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.keywords.map((keyword, kIndex) => (
                            <Badge key={kIndex} variant="outline">{keyword}</Badge>
                          ))}
                        </div>
                      </div>
                )}
                <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Resultados Previstos</h4>
                     <div className="space-y-2">
                      {Object.entries(result.predicted_results).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm text-muted-foreground capitalize">
                            {key.replace('_', ' ')}:
                          </span>
                          <span className="text-sm font-medium text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                </div>
                 <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="bg-gradient-primary w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Lançar Campanha (Funcionalidade Futura)
                    </Button>
                  </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AICreative;