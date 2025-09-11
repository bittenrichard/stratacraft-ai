import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3001;

// Configuração do CORS
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'https://dashboard.agenciastorytelling.com.br'],
  credentials: true
}));

app.use(express.json());

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cwnioogiqacbqunaungs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNTE4MDAsImV4cCI6MjA1MTkyNzgwMH0.xZtmYEaUGQwgEjCFLLDnLDjLqoYFjFZaY3fmWQ7fpJU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting - cache simples em memória 
const rateLimitCache = new Map();

// Função para verificar rate limiting
function checkRateLimit(ip) {
  const now = Date.now();
  const userLimits = rateLimitCache.get(ip) || { count: 0, resetTime: now, blockedUntil: 0 };
  
  // Se está bloqueado, verificar se o bloqueio expirou
  if (userLimits.blockedUntil > now) {
    const waitMinutes = Math.ceil((userLimits.blockedUntil - now) / (1000 * 60));
    return { 
      allowed: false, 
      blocked: true, 
      wait_minutes: waitMinutes,
      message: `IP bloqueado por ${waitMinutes} minutos devido a muitas tentativas.`
    };
  }
  
  // Reset do contador a cada hora
  if (now > userLimits.resetTime) {
    userLimits.count = 0;
    userLimits.resetTime = now + (60 * 60 * 1000); // 1 hora
    userLimits.blockedUntil = 0;
  }
  
  userLimits.count++;
  
  // Aplicar limites progressivos
  if (userLimits.count > 20) {
    // 20+ tentativas: bloquear por 30 minutos
    userLimits.blockedUntil = now + (30 * 60 * 1000);
    rateLimitCache.set(ip, userLimits);
    return { 
      allowed: false, 
      blocked: true, 
      wait_minutes: 30,
      message: 'Muitas tentativas. IP bloqueado por 30 minutos.'
    };
  } else if (userLimits.count > 10) {
    // 10+ tentativas: bloquear por 15 minutos
    userLimits.blockedUntil = now + (15 * 60 * 1000);
    rateLimitCache.set(ip, userLimits);
    return { 
      allowed: false, 
      blocked: true, 
      wait_minutes: 15,
      message: 'Muitas tentativas. IP bloqueado por 15 minutos.'
    };
  } else if (userLimits.count > 5) {
    // 5+ tentativas: bloquear por 5 minutos
    userLimits.blockedUntil = now + (5 * 60 * 1000);
    rateLimitCache.set(ip, userLimits);
    return { 
      allowed: false, 
      blocked: true, 
      wait_minutes: 5,
      message: 'Muitas tentativas. IP bloqueado por 5 minutos.'
    };
  }
  
  rateLimitCache.set(ip, userLimits);
  return { allowed: true, blocked: false };
}

// Função de retry com backoff exponencial
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      // Se teve erro de rate limit, aguardar antes de tentar novamente
      if (data.error && (data.error.code === 4 || data.error.code === 368)) {
        if (i === maxRetries - 1) throw new Error('Rate limit do Facebook atingido');
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Rate limit detectado, aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return { response, data };
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const waitTime = Math.pow(2, i) * 1000;
      console.log(`Erro na tentativa ${i + 1}, aguardando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Endpoint para trocar code por access token
app.post('/api/meta-exchange-token', async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  console.log(`[${new Date().toISOString()}] Nova requisição de token exchange do IP: ${clientIp}`);
  
  try {
    // Verificar rate limiting
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      console.log(`[${new Date().toISOString()}] IP ${clientIp} bloqueado por rate limiting`);
      return res.status(429).json({
        error: { 
          message: rateLimitCheck.message,
          code: 'RATE_LIMITED'
        },
        is_rate_limited: true,
        wait_minutes: rateLimitCheck.wait_minutes
      });
    }
    
    const { code, redirect_uri } = req.body;
    
    if (!code || !redirect_uri) {
      console.log(`[${new Date().toISOString()}] Parâmetros inválidos recebidos`);
      return res.status(400).json({ 
        error: { message: 'Code e redirect_uri são obrigatórios' }
      });
    }
    
    console.log(`[${new Date().toISOString()}] Tentando trocar code por token...`);
    
    const appId = '707350985805370';
    const appSecret = '0c3ecf8c4f05f0b36d7e3e926d04e6ec';
    
    const { response, data } = await fetchWithRetry(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirect_uri,
          code: code
        }).toString()
      }
    );
    
    console.log(`[${new Date().toISOString()}] Resposta do Facebook recebida:`, {
      status: response.status,
      hasAccessToken: !!data.access_token,
      hasError: !!data.error,
      errorCode: data.error?.code,
      errorMessage: data.error?.message
    });
    
    if (data.error) {
      console.error(`[${new Date().toISOString()}] Erro do Facebook:`, data.error);
      
      // Mapear códigos de erro específicos
      if (data.error.code === 368 || data.error.code === 4) {
        return res.status(429).json({
          error: data.error,
          is_rate_limited: true,
          wait_minutes: 15,
          message: 'Rate limit do Facebook atingido. Aguarde 15 minutos.'
        });
      }
      
      return res.status(400).json({ error: data.error });
    }
    
    if (!data.access_token) {
      console.error(`[${new Date().toISOString()}] Token não recebido na resposta do Facebook`);
      return res.status(400).json({ 
        error: { message: 'Token de acesso não foi retornado pelo Facebook' }
      });
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Token obtido com sucesso em ${processingTime}ms`);
    
    res.json({ 
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] Erro no exchange de token (${processingTime}ms):`, error);
    
    res.status(500).json({ 
      error: { 
        message: 'Erro interno do servidor',
        details: error.message
      }
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    rateLimitCacheSize: rateLimitCache.size
  });
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Servidor Meta OAuth rodando na porta ${PORT}`);
  console.log(`[${new Date().toISOString()}] Health check disponível em http://localhost:${PORT}/health`);
});
