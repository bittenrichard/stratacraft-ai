import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Building2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
}

interface TempData {
  access_token: string;
  user_info: any;
  ad_accounts: AdAccount[];
  workspace_id: string;
}

// Função para salvar a integração
const saveIntegration = async (selectedAccount: AdAccount, accessToken: string, userInfo: any, workspaceId: string, adAccounts: AdAccount[]) => {
  console.log('Salvando integração para conta:', selectedAccount.name, selectedAccount.id);
  
  const integrationData = {
    workspace_id: workspaceId,
    platform: 'meta',
    access_token: accessToken,
    account_id: selectedAccount.id.replace('act_', ''), // Remover prefixo 'act_' se presente
    account_name: selectedAccount.name,
    is_active: true,
    settings: {
      user_info: userInfo,
      ad_accounts: adAccounts,
      selected_account: selectedAccount
    }
  };

  try {
    // Primeiro, verificar se já existe uma integração Meta para este workspace
    const { data: existing, error: checkError } = await supabase
      .from('ad_integrations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'meta')
      .limit(1);

    let result;
    if (existing && existing.length > 0) {
      // Atualizar existente
      result = await supabase
        .from('ad_integrations')
        .update(integrationData)
        .eq('id', existing[0].id)
        .select();
    } else {
      // Inserir novo
      result = await supabase
        .from('ad_integrations')
        .insert([integrationData])
        .select();
    }

    if (result.error) {
      console.error('Erro ao salvar integração no banco:', result.error);
      throw result.error;
    } else {
      console.log('Integração salva com sucesso no banco!', result.data);
    }
  } catch (dbError) {
    console.error('Erro na tentativa de salvar no banco:', dbError);
    // Salvar no localStorage como fallback
    const localStorageKey = `meta_integration_data_${workspaceId}`;
    localStorage.setItem(localStorageKey, JSON.stringify({
      ...integrationData,
      created_at: new Date().toISOString()
    }));
    console.log('Dados salvos no localStorage como fallback');
  }
};

export default function MetaSelectAccount() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tempData, setTempData] = useState<TempData | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Recuperar dados temporários
    const tempDataStr = sessionStorage.getItem('meta_temp_data');
    if (!tempDataStr) {
      toast({
        title: "Erro",
        description: "Dados de autenticação não encontrados. Tente conectar novamente.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    try {
      const data = JSON.parse(tempDataStr);
      setTempData(data);
    } catch (error) {
      console.error('Erro ao fazer parse dos dados temporários:', error);
      toast({
        title: "Erro",
        description: "Dados corrompidos. Tente conectar novamente.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [navigate, toast]);

  const handleAccountSelect = async (account: AdAccount) => {
    if (!tempData) return;

    setSaving(true);
    try {
      await saveIntegration(
        account, 
        tempData.access_token, 
        tempData.user_info, 
        tempData.workspace_id, 
        tempData.ad_accounts
      );

      // Limpar dados temporários
      sessionStorage.removeItem('meta_temp_data');

      toast({
        title: "Conexão bem sucedida!",
        description: `Conta "${account.name}" conectada com sucesso!`
      });

      // Redirecionar para integrações
      localStorage.setItem('openTab', 'integrations');
      navigate('/');

    } catch (error) {
      console.error('Erro ao salvar integração:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getAccountStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="default" className="bg-green-100 text-green-800">Ativa</Badge>;
      case 2:
        return <Badge variant="secondary">Desabilitada</Badge>;
      case 3:
        return <Badge variant="destructive">Não resolvida</Badge>;
      case 7:
        return <Badge variant="outline">Pendente de revisão</Badge>;
      case 9:
        return <Badge variant="outline">Em revisão</Badge>;
      case 101:
        return <Badge variant="destructive">Fechada</Badge>;
      default:
        return <Badge variant="outline">Status {status}</Badge>;
    }
  };

  if (!tempData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Carregando...</h1>
          <p className="text-muted-foreground">Processando dados de autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Selecionar Conta de Anúncios</h1>
            <p className="text-muted-foreground">
              Escolha qual conta de anúncios você deseja conectar ao sistema
            </p>
          </div>
        </div>

        {/* Informações do usuário */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Autenticação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Conectado como: <strong>{tempData.user_info.name}</strong> ({tempData.user_info.id})
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {tempData.ad_accounts.length} conta(s) de anúncios encontrada(s)
            </p>
          </CardContent>
        </Card>

        {/* Lista de contas */}
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold">Contas de Anúncios Disponíveis</h2>
          
          {tempData.ad_accounts.map((account) => (
            <Card 
              key={account.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedAccount?.id === account.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedAccount(account)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Building2 className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-semibold text-lg">{account.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {account.id.replace('act_', '')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Moeda: {account.currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getAccountStatusBadge(account.account_status)}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccountSelect(account);
                      }}
                      disabled={saving || account.account_status !== 1}
                      className="w-24"
                    >
                      {saving && selectedAccount?.id === account.id ? 'Salvando...' : 'Selecionar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tempData.ad_accounts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma conta encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Não foram encontradas contas de anúncios associadas à sua conta Meta.
              </p>
              <p className="text-sm text-muted-foreground">
                Verifique se você tem acesso a contas de anúncios no Meta Business Manager.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
