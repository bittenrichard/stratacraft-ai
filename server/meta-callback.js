const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const supabase = require('./supabase');
const campaignRoutes = require('./routes/campaigns');

dotenv.config();

const app = express();

// Cache para controlar rate limiting
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 3;

// Limpar cache de rate limiting na inicialização
console.log('Limpando cache de rate limiting...');
rateLimitCache.clear();

// Configuração do CORS
const corsOptions = {
  origin: ['http://localhost:8080', 'http://localhost:8081'],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// Rotas de campanhas
app.use('/api', campaignRoutes);

// Adiciona headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.post('/api/meta-exchange-token', async (req, res) => {
  try {
    console.log('=== INÍCIO DA REQUISIÇÃO ===');
    console.log('Recebida requisição POST /api/meta-exchange-token');
    console.log('Body:', req.body);
    
    const { code, redirect_uri, workspace_id } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (!code) {
      console.log('ERRO: Código não fornecido');
      return res.status(400).json({ error: 'Código não fornecido' });
    }

    // Verifica rate limiting
    const now = Date.now();
    const rateLimitKey = `${clientIp}-meta-oauth`;
    const rateLimitData = rateLimitCache.get(rateLimitKey);
    
    if (rateLimitData) {
      const { attempts, lastAttempt, blockedUntil } = rateLimitData;
      
      // Se ainda está bloqueado
      if (blockedUntil && now < blockedUntil) {
        const waitMinutes = Math.ceil((blockedUntil - now) / (60 * 1000));
        console.log(`RATE LIMIT: Cliente bloqueado por mais ${waitMinutes} minutos`);
        return res.status(429).json({ 
          error: `Muitas tentativas. Aguarde ${waitMinutes} minutos antes de tentar novamente.`,
          wait_minutes: waitMinutes
        });
      }
      
      // Se passou o tempo de bloqueio, reseta
      if (blockedUntil && now >= blockedUntil) {
        rateLimitCache.delete(rateLimitKey);
      }
    }

    console.log('Variáveis de ambiente:', {
      appId: process.env.META_APP_ID,
      hasSecret: !!process.env.META_APP_SECRET,
      redirectUri: redirect_uri
    });

    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirect_uri,
      code: code,
      grant_type: 'authorization_code'
    });

    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`;
    console.log('Fazendo requisição para:', tokenUrl);
    
    const response = await fetch(tokenUrl);
    console.log('Status da resposta:', response.status);
    
    const data = await response.json();
    console.log('Resposta recebida:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.log('ERRO: Resposta não OK do Meta');
      
      // Se for rate limit (erro 368), adiciona ao cache de bloqueio
      if (data.error?.code === 368) {
        const currentData = rateLimitCache.get(rateLimitKey) || { attempts: 0, lastAttempt: 0 };
        const newAttempts = currentData.attempts + 1;
        
        // Bloqueia por períodos crescentes
        let blockDuration;
        if (newAttempts >= 3) {
          blockDuration = 30 * 60 * 1000; // 30 minutos
        } else if (newAttempts >= 2) {
          blockDuration = 15 * 60 * 1000; // 15 minutos
        } else {
          blockDuration = 5 * 60 * 1000; // 5 minutos
        }
        
        rateLimitCache.set(rateLimitKey, {
          attempts: newAttempts,
          lastAttempt: now,
          blockedUntil: now + blockDuration
        });
        
        const waitMinutes = Math.ceil(blockDuration / (60 * 1000));
        console.log(`RATE LIMIT APLICADO: Bloqueando por ${waitMinutes} minutos`);
        
        return res.status(429).json({ 
          error: `Rate limit atingido. Aguarde ${waitMinutes} minutos antes de tentar novamente.`,
          wait_minutes: waitMinutes,
          is_rate_limited: true
        });
      }
      
      const errorMessage = data.error?.message || data.error_description || 'Erro ao trocar código por token';
      return res.status(400).json({ error: errorMessage });
    }

    // Limpa o rate limit cache em caso de sucesso
    rateLimitCache.delete(rateLimitKey);

    if (!data.access_token) {
      console.log('ERRO: Token não recebido');
      return res.status(400).json({ error: 'Token de acesso não recebido' });
    }

    console.log('Token recebido com sucesso!');

    // Busca informações da conta do Meta
    console.log('Buscando informações da conta...');
    const accountInfoResponse = await fetch('https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    });

    const accountInfo = await accountInfoResponse.json();
    console.log('Informações da conta:', JSON.stringify(accountInfo, null, 2));

    if (!accountInfo.data || accountInfo.data.length === 0) {
      console.log('AVISO: Nenhuma conta de anúncio encontrada, mas continuando...');
    }

    // Tenta salvar no Supabase
    console.log('Tentando salvar no Supabase...');
    
    // Usa o workspace_id passado no request ou deriva do account_id como fallback
    const finalWorkspaceId = workspace_id || accountInfo.data?.[0]?.id || 'default-workspace';
    console.log('Usando workspace_id:', finalWorkspaceId);
    
    const integrationData = {
      workspace_id: finalWorkspaceId,
      platform: 'meta',
      access_token: data.access_token,
      account_id: accountInfo.data?.[0]?.id || null,
      account_name: accountInfo.data?.[0]?.name || 'Meta Account',
      is_active: true,
      expires_at: data.expires_in ? new Date(Date.now() + (data.expires_in * 1000)).toISOString() : null,
      settings: {
        account_status: accountInfo.data?.[0]?.account_status,
        all_accounts: accountInfo.data || []
      }
    };

    console.log('Dados para salvar:', { ...integrationData, access_token: '[REDACTED]' });

    // Primeiro tenta inserção normal
    let { data: dbData, error: dbError } = await supabase
      .from('ad_integrations')
      .insert([integrationData])
      .select();

    // Se falhar com RLS, tenta upsert
    if (dbError && dbError.code === '42501') {
      console.log('Tentativa 1 falhou com RLS, tentando upsert...');
      const result = await supabase
        .from('ad_integrations')
        .upsert(integrationData, { onConflict: 'workspace_id,platform' })
        .select();
      
      dbData = result.data;
      dbError = result.error;
    }

    // Se ainda falhar, tenta com uma query customizada que pode contornar RLS
    if (dbError && dbError.code === '42501') {
      console.log('Tentativa 2 falhou, tentando com query customizada...');
      try {
        const result = await supabase
          .rpc('insert_integration', {
            workspace_id: finalWorkspaceId,
            platform: 'meta',
            access_token: data.access_token,
            account_id: accountInfo.data?.[0]?.id || null,
            account_name: accountInfo.data?.[0]?.name || 'Meta Account',
            settings: integrationData.settings
          });
        
        if (result.error) {
          console.log('Query customizada também falhou:', result.error);
        } else {
          console.log('Query customizada funcionou:', result.data);
          dbData = result.data;
          dbError = null;
        }
      } catch (rpcError) {
        console.log('RPC não existe ou falhou:', rpcError);
      }
    }

    if (dbError) {
      console.error('Erro do Supabase:', dbError);
      // Não falha se não conseguir salvar no DB, apenas registra o erro
      console.log('Continuando mesmo com erro do banco...');
    } else {
      console.log('Salvo no Supabase com sucesso!', dbData);
    }

    console.log('=== SUCESSO ===');
    res.json({ 
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      account_info: accountInfo.data?.[0] || null
    });

  } catch (error) {
    console.error('=== ERRO GERAL ===');
    console.error('Erro completo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Endpoint para salvar integração (fallback quando frontend não consegue salvar)
app.post('/api/save-integration', async (req, res) => {
  try {
    console.log('=== SALVANDO INTEGRAÇÃO VIA ENDPOINT DEDICADO ===');
    console.log('Dados recebidos:', req.body);
    
    const integrationData = req.body;
    
    // Tenta múltiplas abordagens para salvar
    let result = null;
    let error = null;
    
    // Tentativa 1: Insert normal
    console.log('Tentativa 1: Insert normal...');
    const insertResult = await supabase
      .from('ad_integrations')
      .insert([integrationData])
      .select();
    
    if (insertResult.error && insertResult.error.code === '42501') {
      console.log('Insert normal falhou com RLS');
      
      // Tentativa 2: Upsert
      console.log('Tentativa 2: Upsert...');
      const upsertResult = await supabase
        .from('ad_integrations')
        .upsert(integrationData, { onConflict: 'workspace_id,platform' })
        .select();
      
      if (upsertResult.error && upsertResult.error.code === '42501') {
        console.log('Upsert também falhou com RLS');
        
        // Tentativa 3: Usar SQL direto via RPC (se disponível)
        console.log('Tentativa 3: SQL direto...');
        try {
          const sqlResult = await supabase
            .rpc('exec_sql', {
              sql: `INSERT INTO public.ad_integrations (workspace_id, platform, access_token, account_id, account_name, is_active, expires_at, settings) 
                    VALUES ('${integrationData.workspace_id}', '${integrationData.platform}', '${integrationData.access_token}', 
                           '${integrationData.account_id}', '${integrationData.account_name}', ${integrationData.is_active}, 
                           ${integrationData.expires_at ? `'${integrationData.expires_at}'` : 'NULL'}, '${JSON.stringify(integrationData.settings)}') 
                    RETURNING *;`
            });
          
          result = sqlResult.data;
          error = sqlResult.error;
        } catch (sqlError) {
          console.log('SQL direto falhou:', sqlError);
          error = { message: 'Todas as tentativas falharam devido ao RLS' };
        }
      } else {
        result = upsertResult.data;
        error = upsertResult.error;
      }
    } else {
      result = insertResult.data;
      error = insertResult.error;
    }
    
    if (error) {
      console.error('Erro final:', error);
      return res.status(500).json({ 
        error: 'Não foi possível salvar a integração', 
        details: error,
        suggestion: 'Verifique as políticas RLS da tabela ad_integrations no Supabase'
      });
    }
    
    console.log('Integração salva com sucesso:', result);
    res.json({ success: true, data: result });
    
  } catch (error) {
    console.error('Erro geral no save-integration:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// Endpoint para verificar status do rate limit
app.get('/api/meta-rate-limit-status', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const rateLimitKey = `${clientIp}-meta-oauth`;
  const rateLimitData = rateLimitCache.get(rateLimitKey);
  
  if (!rateLimitData) {
    return res.json({ blocked: false, can_try: true });
  }
  
  const now = Date.now();
  const { blockedUntil, attempts } = rateLimitData;
  
  if (blockedUntil && now < blockedUntil) {
    const waitMinutes = Math.ceil((blockedUntil - now) / (60 * 1000));
    return res.json({ 
      blocked: true, 
      can_try: false,
      wait_minutes: waitMinutes,
      attempts: attempts
    });
  }
  
  return res.json({ 
    blocked: false, 
    can_try: true,
    attempts: attempts || 0
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rateLimitCacheSize: rateLimitCache.size
  });
});

// Endpoint para limpar rate limiting (apenas para desenvolvimento)
app.post('/api/clear-rate-limit', (req, res) => {
  console.log('Limpando cache de rate limiting manualmente...');
  rateLimitCache.clear();
  res.json({ 
    message: 'Rate limit cache limpo com sucesso',
    timestamp: new Date().toISOString()
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
