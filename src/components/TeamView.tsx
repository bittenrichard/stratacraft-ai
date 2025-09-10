import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

type Member = {
  profile_id: string;
  role: 'owner' | 'member' | 'client';
  profiles: {
    full_name: string | null;
    users: {
      email: string | null;
    } | null;
  } | null;
};

const TeamView = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'client'>('member');
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Primeiro, descobre em qual workspace o usuário atual está
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profileData, error: profileError } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
      if (profileError || !profileData) throw profileError || new Error("Perfil não encontrado");
      
      const { data: memberData, error: memberError } = await supabase.from('workspace_members').select('workspace_id').eq('profile_id', profileData.id).single();
      if (memberError || !memberData) throw memberError || new Error("Workspace não encontrado");
      
      const workspaceId = memberData.workspace_id;
      setCurrentWorkspaceId(workspaceId);

      // Agora, busca todos os membros desse workspace
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select(`
          profile_id,
          role,
          profiles (
            full_name,
            users ( email )
          )
        `)
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error: any) {
      toast({ title: "Erro ao buscar membros", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !currentWorkspaceId) {
      toast({ title: "Preencha o email do convidado.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          workspace_id: currentWorkspaceId,
        },
      });

      if (error) throw error;

      toast({ title: "Convite enviado!", description: `Um email de convite foi enviado para ${inviteEmail}.` });
      setInviteOpen(false);
      setInviteEmail('');
    } catch (error: any) {
      toast({ title: "Erro ao enviar convite", description: error.message, variant: "destructive" });
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Equipe e Clientes
          </h1>
          <p className="text-muted-foreground">
            Gerencie quem tem acesso a este workspace.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={fetchMembers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={isInviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-2"/>Convidar Membro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Convidar para o Workspace</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="email">Email do Convidado</Label>
                  <Input id="email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                 <div>
                  <Label htmlFor="role">Papel</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="member">Membro da Equipe</SelectItem>
                          <SelectItem value="client">Cliente (Visualização)</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite}>Enviar Convite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
       <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Carregando membros...</TableCell></TableRow>
              ) : members.map(member => (
                <TableRow key={member.profile_id}>
                  <TableCell className="font-medium">{member.profiles?.full_name || 'Aguardando cadastro'}</TableCell>
                  <TableCell>{member.profiles?.users?.email || 'N/A'}</TableCell>
                  <TableCell><Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>{member.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    {member.role !== 'owner' && <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamView;