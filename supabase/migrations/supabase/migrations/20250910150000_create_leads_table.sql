-- Tabela para armazenar e gerenciar leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações do Lead
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Status do Lead no Funil
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'won', 'lost')),
  
  -- Atribuição e Origem
  source TEXT NOT NULL DEFAULT 'whatsapp', -- Ex: whatsapp, form, phone_call
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Notas e Observações
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilita a segurança em nível de linha
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Cria as políticas de acesso: usuários só podem gerenciar seus próprios leads
CREATE POLICY "Users can manage their own leads"
ON public.leads
FOR ALL
USING (auth.uid() = user_id);

-- Cria o gatilho para atualizar o campo 'updated_at' automaticamente
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();