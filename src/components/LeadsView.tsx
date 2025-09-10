import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, RefreshCw } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

const LeadsView = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const { toast } = useToast();

  const initialFormData = {
    name: '',
    phone: '',
    email: '',
    status: 'new',
    source: 'whatsapp',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast({ title: "Erro ao buscar leads", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async () => {
    if (!formData.name || !formData.phone) {
      toast({ title: "Nome e Telefone são obrigatórios", variant: "destructive" });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const leadData = { ...formData, user_id: user.id };
      
      const { error } = editingLead
        ? await supabase.from('leads').update(leadData).eq('id', editingLead.id)
        : await supabase.from('leads').insert(leadData);

      if (error) throw error;
      
      toast({ title: `Lead ${editingLead ? 'atualizado' : 'adicionado'} com sucesso!` });
      setIsFormOpen(false);
      fetchLeads();
    } catch (error: any) {
      toast({ title: `Erro ao salvar lead`, description: error.message, variant: "destructive" });
    }
  };
  
  const openFormForNew = () => {
    setEditingLead(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };
  
  // No futuro, podemos implementar a edição
  // const openFormForEdit = (lead: Lead) => { ... }

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Gestão de Leads
          </h1>
          <p className="text-muted-foreground">
            Adicione e acompanhe os contatos gerados pelas suas campanhas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" onClick={openFormForNew}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingLead ? 'Editar Lead' : 'Adicionar Novo Lead'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="name">Nome*</Label><Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div><Label htmlFor="phone">Telefone (WhatsApp)*</Label><Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                </div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Origem</Label><Input value={formData.source} disabled /></div>
                    <div><Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">Novo</SelectItem>
                                <SelectItem value="contacted">Contactado</SelectItem>
                                <SelectItem value="qualified">Qualificado</SelectItem>
                                <SelectItem value="unqualified">Não Qualificado</SelectItem>
                                <SelectItem value="won">Ganhou</SelectItem>
                                <SelectItem value="lost">Perdeu</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div><h3 className="text-sm font-medium mb-2">Dados de Atribuição (UTMs)</h3></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Origem (utm_source)</Label><Input placeholder="ex: facebook" value={formData.utm_source} onChange={e => setFormData({...formData, utm_source: e.target.value})} /></div>
                  <div><Label>Mídia (utm_medium)</Label><Input placeholder="ex: cpc" value={formData.utm_medium} onChange={e => setFormData({...formData, utm_medium: e.target.value})} /></div>
                  <div><Label>Campanha (utm_campaign)</Label><Input placeholder="ex: black-friday" value={formData.utm_campaign} onChange={e => setFormData({...formData, utm_campaign: e.target.value})} /></div>
                </div>
                 <div><Label>Notas</Label><Textarea placeholder="Adicione observações sobre o lead..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveLead}>Salvar Lead</Button>
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
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campanha (UTM)</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
              ) : leads.length > 0 ? (
                leads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.phone || lead.email}</TableCell>
                    <TableCell><Badge variant="secondary">{lead.status}</Badge></TableCell>
                    <TableCell>{lead.utm_campaign || 'N/A'}</TableCell>
                    <TableCell>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center">Nenhum lead encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsView;