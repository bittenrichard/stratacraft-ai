import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tables } from '@/integrations/supabase/types';

type CalendarEvent = Tables<'calendar_events'>;

const CalendarView = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    platform: 'instagram',
    status: 'draft',
    scheduled_at_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_at_time: '12:00',
  });

  useEffect(() => {
    fetchEvents(currentMonth);
  }, [currentMonth]);

  const fetchEvents = async (month: Date) => {
    setLoading(true);
    try {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({ title: "Erro ao buscar eventos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!formData.title) {
        toast({ title: "Título é obrigatório", variant: "destructive" });
        return;
    }
      
    try {
      const scheduled_at = new Date(`${formData.scheduled_at_date}T${formData.scheduled_at_time}:00`).toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const eventData = {
        user_id: user.id,
        title: formData.title,
        content: formData.content,
        platform: formData.platform,
        status: formData.status,
        scheduled_at,
      };

      let error;
      if (editingEvent) {
        ({ error } = await supabase.from('calendar_events').update(eventData).eq('id', editingEvent.id));
      } else {
        ({ error } = await supabase.from('calendar_events').insert(eventData));
      }

      if (error) throw error;

      toast({ title: `Post ${editingEvent ? 'atualizado' : 'criado'} com sucesso!` });
      setIsFormOpen(false);
      setEditingEvent(null);
      fetchEvents(currentMonth);
    } catch (error: any) {
      toast({ title: `Erro ao salvar post`, description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
      if (error) throw error;
      toast({ title: "Post removido com sucesso." });
      fetchEvents(currentMonth);
    } catch (error: any) {
      toast({ title: "Erro ao remover post", description: error.message, variant: "destructive" });
    }
  };

  const openFormForNew = (date: Date) => {
    setEditingEvent(null);
    setFormData({
      title: '',
      content: '',
      platform: 'instagram',
      status: 'draft',
      scheduled_at_date: format(date, 'yyyy-MM-dd'),
      scheduled_at_time: '12:00',
    });
    setIsFormOpen(true);
  };

  const openFormForEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    const scheduledDate = new Date(event.scheduled_at);
    setFormData({
      title: event.title,
      content: event.content || '',
      platform: event.platform,
      status: event.status,
      scheduled_at_date: format(scheduledDate, 'yyyy-MM-dd'),
      scheduled_at_time: format(scheduledDate, 'HH:mm'),
    });
    setIsFormOpen(true);
  };
  
  const getStatusBadgeVariant = (status: string) => ({
    'draft': 'outline',
    'pending_approval': 'secondary',
    'approved': 'default',
    'posted': 'default',
  }[status] || 'outline') as any;

  const eventsByDay = events.reduce((acc, event) => {
    const day = format(new Date(event.scheduled_at), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Calendário de Conteúdo
          </h1>
          <p className="text-muted-foreground">
            Planeje, agende e visualize seus posts para redes sociais.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingEvent(null); setIsFormOpen(isOpen); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={() => openFormForNew(selectedDate)}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Editar Post' : 'Agendar Novo Post'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Título do post..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <Label htmlFor="content">Legenda</Label>
              <Textarea id="content" placeholder="Escreva a legenda aqui..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" type="date" value={formData.scheduled_at_date} onChange={e => setFormData({...formData, scheduled_at_date: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="time">Hora</Label>
                  <Input id="time" type="time" value={formData.scheduled_at_time} onChange={e => setFormData({...formData, scheduled_at_time: e.target.value})} />
                </div>
              </div>
              <Label htmlFor="platform">Plataforma</Label>
              <Select value={formData.platform} onValueChange={(v) => setFormData({...formData, platform: v as any})}>
                <SelectTrigger id="platform"><SelectValue placeholder="Plataforma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="status">Status</Label>
               <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as any})}>
                <SelectTrigger id="status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="draft">Rascunho</SelectItem>
                   <SelectItem value="pending_approval">Pendente</SelectItem>
                   <SelectItem value="approved">Aprovado</SelectItem>
                   <SelectItem value="posted">Postado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveEvent}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-card border-border shadow-card">
          <CardContent className="p-2">
             <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(day) => day && setSelectedDate(day)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              className="w-full"
              components={{
                DayContent: ({ date }) => {
                  const dayKey = format(date, 'yyyy-MM-dd');
                  // CORREÇÃO: Usamos '|| []' para garantir que dayEvents seja sempre um array, nunca undefined.
                  const dayEvents = eventsByDay[dayKey] || [];
                  return (
                    <div className="relative h-full w-full flex items-center justify-center">
                      <time dateTime={date.toString()}>{date.getDate()}</time>
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-1 flex space-x-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div key={event.id} className={`h-1.5 w-1.5 rounded-full ${event.platform === 'instagram' ? 'bg-pink-500' : 'bg-blue-500'}`}></div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              }}
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Posts de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto" /> : 
            (eventsByDay[format(selectedDate, 'yyyy-MM-dd')] || []).length > 0 ? (
                <div className="space-y-4">
                  {(eventsByDay[format(selectedDate, 'yyyy-MM-dd')] || []).map(event => (
                    <div key={event.id} className="p-3 rounded-md bg-muted/50 border border-border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(event.scheduled_at), 'HH:mm')} - {event.platform}</p>
                        </div>
                         <Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge>
                      </div>
                      <p className="text-sm mt-2 line-clamp-2">{event.content}</p>
                       <div className="flex gap-2 mt-3">
                         <Button size="sm" variant="outline" onClick={() => openFormForEdit(event)}><Edit className="h-3 w-3"/></Button>
                         <Button size="sm" variant="destructive" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="h-3 w-3"/></Button>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Nenhum post agendado para este dia.</p>
                <Button variant="link" onClick={() => openFormForNew(selectedDate)}>Agendar um post</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarView;