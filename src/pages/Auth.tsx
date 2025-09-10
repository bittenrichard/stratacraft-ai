import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Login realizado com sucesso!" });
        // O redirecionamento será tratado pelo listener de auth no App.tsx
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Após cadastro, criar perfil com nome da empresa
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert({ user_id: data.user.id, company_name: company });
          if (profileError) throw profileError;
        }
        toast({ title: "Cadastro realizado!", description: "Verifique seu e-mail para confirmar a conta." });
      }
    } catch (error: any) {
      toast({ title: "Erro de autenticação", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <Card className="w-full max-w-md bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle>{isLogin ? 'Login' : 'Criar Conta'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Acesse sua conta para gerenciar suas campanhas.' : 'Crie uma nova conta para começar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="company">Nome da Empresa</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Nome da empresa"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="p-1">
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;