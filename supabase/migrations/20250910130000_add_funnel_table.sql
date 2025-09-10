-- Tabela para armazenar dados agregados do funil de vendas
CREATE TABLE public.funnel_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Período dos dados
  date_key DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- Métricas do Topo de Funil (atração)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0, -- Virá do Google Analytics
  
  -- Métricas do Meio de Funil (conversão)
  leads INTEGER DEFAULT 0, -- Captura de contatos
  opportunities INTEGER DEFAULT 0, -- Leads qualificados (ex: do CRM)

  -- Métricas do Fundo de Funil (vendas)
  sales_count INTEGER DEFAULT 0, -- Número de vendas
  sales_value NUMERIC(10, 2) DEFAULT 0.00, -- Valor total das vendas

  -- Custos
  total_spend NUMERIC(10, 2) DEFAULT 0.00,

  -- Chave única para evitar duplicidade de dados por dia por usuário
  UNIQUE(user_id, date_key, period_type)
);

-- Habilita a segurança em nível de linha
ALTER TABLE public.funnel_data ENABLE ROW LEVEL SECURITY;

-- Cria as políticas de acesso: usuários só podem ver seus próprios dados de funil
CREATE POLICY "Users can view their own funnel data"
ON public.funnel_data
FOR SELECT
USING (auth.uid() = user_id);

-- No futuro, funções de backend poderão inserir/atualizar esses dados
-- Por enquanto, vamos permitir que o próprio usuário insira para testes, se necessário.
CREATE POLICY "Users can manage their own funnel data"
ON public.funnel_data
FOR ALL
USING (auth.uid() = user_id);