import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

const SettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; company_name: string | null }>({
    full_name: '',
    company_name: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (error: any) {
      toast({ title: "Erro ao carregar perfil", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          company_name: profile.company_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) throw error;

      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar o perfil", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Configurações da Conta
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas informações de perfil e empresa.
        </p>
      </div>

      <Card className="max-w-2xl bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle>Seu Perfil</CardTitle>
          <CardDescription>Atualize seu nome e o nome da sua empresa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input 
              id="fullName" 
              value={profile.full_name || ''} 
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa</Label>
            <Input 
              id="companyName"
              value={profile.company_name || ''}
              onChange={(e) => setProfile({...profile, company_name: e.target.value})}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpdateProfile}>Salvar Alterações</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SettingsView;