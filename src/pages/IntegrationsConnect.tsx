import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const IntegrationsConnect = () => {
  const { toast } = useToast();

  const handleMetaConnect = () => {
    const appId = '707350985805370';
    const redirectUri = encodeURIComponent('https://dashboard.agenciastorytelling.com.br/oauth/meta/callback');
    const scope = encodeURIComponent('ads_management,ads_read,business_management,pages_show_list');
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=meta`;
    window.location.href = authUrl;
  };

  const handleGoogleConnect = () => {
    // Aqui você irá iniciar o fluxo OAuth do Google Ads
    toast({ title: 'Conexão Google Ads', description: 'Fluxo de OAuth do Google Ads será iniciado.' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <Card className="w-full max-w-md bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle>Conectar Contas de Anúncio</CardTitle>
          <CardDescription>
            Conecte suas contas de anúncio para centralizar e visualizar o desempenho das campanhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full bg-gradient-primary" onClick={handleMetaConnect}>
            Conectar Meta Ads
          </Button>
          <Button className="w-full bg-gradient-primary" onClick={handleGoogleConnect}>
            Conectar Google Ads
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsConnect;
