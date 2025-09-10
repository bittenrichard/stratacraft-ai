import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Sparkles, Copy, Download, Play, Settings } from 'lucide-react';

const AICreative = () => {
  const [selectedPlatform, setSelectedPlatform] = useState('meta');

  const creativeExamples = [
    {
      title: "Black Friday - Eletrônicos",
      platform: "Meta Ads",
      copy: "🔥 BLACK FRIDAY IMPERDÍVEL! Eletrônicos com até 70% OFF! Smartphones, notebooks, TVs e muito mais. Frete GRÁTIS para todo Brasil. Últimas horas! 🚀",
      audience: "Homens e mulheres, 25-45 anos, interessados em tecnologia",
      budget: "R$ 500/dia",
      predicted_results: { reach: "12.5K", ctr: "3.2%", cpa: "R$ 42" }
    },
    {
      title: "Campanha Retargeting - Carrinho",
      platform: "Google Ads",
      copy: "Esqueceu algo no seu carrinho? 🛒 Finalize sua compra agora e ganhe 15% de desconto! Use o cupom VOLTA15. Válido por 24h.",
      keywords: ["carrinho abandonado", "finalizar compra", "desconto"],
      budget: "R$ 200/dia",
      predicted_results: { impressions: "8.2K", ctr: "4.1%", cpa: "R$ 28" }
    }
  ];

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
              <label className="text-sm font-medium text-foreground mb-2 block">Plataforma</label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
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
              <label className="text-sm font-medium text-foreground mb-2 block">Produto/Serviço</label>
              <Input placeholder="Ex: Curso de marketing digital, Loja de roupas..." />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Objetivo da Campanha</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversions">Conversões</SelectItem>
                  <SelectItem value="traffic">Tráfego</SelectItem>
                  <SelectItem value="awareness">Conscientização</SelectItem>
                  <SelectItem value="leads">Geração de Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Orçamento Diário</label>
              <Input placeholder="Ex: R$ 100" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Público-Alvo (opcional)</label>
              <Textarea placeholder="Descreva seu público ideal: idade, interesses, comportamentos..." rows={3} />
            </div>

            <Button className="w-full bg-gradient-primary">
              <Brain className="h-4 w-4 mr-2" />
              Gerar Campanha com IA
            </Button>
          </CardContent>
        </Card>

        {/* Campaign Preview */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Preview da Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg p-4 bg-muted/30 min-h-[400px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configure os parâmetros e clique em "Gerar Campanha"</p>
                <p className="text-xs mt-2">A IA criará copy, segmentação e estrutura automaticamente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generated Campaigns */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Campanhas Geradas pela IA</CardTitle>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configurar IA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {creativeExamples.map((campaign, index) => (
              <div key={index} className="border border-border rounded-lg p-6 bg-muted/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{campaign.title}</h3>
                    <Badge variant="secondary" className="mt-1">{campaign.platform}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="bg-gradient-primary">
                      <Play className="h-4 w-4 mr-2" />
                      Lançar
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Copy Gerado</h4>
                    <div className="bg-background/50 rounded-lg p-3 border border-border">
                      <p className="text-sm text-foreground">{campaign.copy}</p>
                    </div>

                    {campaign.platform === "Meta Ads" && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">Segmentação</h4>
                        <p className="text-sm text-muted-foreground">{campaign.audience}</p>
                      </div>
                    )}

                    {campaign.platform === "Google Ads" && campaign.keywords && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">Palavras-chave</h4>
                        <div className="flex flex-wrap gap-2">
                          {campaign.keywords.map((keyword, kIndex) => (
                            <Badge key={kIndex} variant="outline">{keyword}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Resultados Previstos</h4>
                    <div className="space-y-2">
                      {Object.entries(campaign.predicted_results).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm text-muted-foreground capitalize">
                            {key.replace('_', ' ')}:
                          </span>
                          <span className="text-sm font-medium text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-foreground mb-2">Orçamento</h4>
                      <p className="text-sm text-muted-foreground">{campaign.budget}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AICreative;