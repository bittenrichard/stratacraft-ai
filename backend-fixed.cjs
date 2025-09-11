const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3012;

// Função para tentar portas alternativas
const startServer = (port, maxRetries = 5) => {
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`✅ Servidor rodando na porta ${port}`);
    console.log(`🌐 Health: http://localhost:${port}/health`);
    console.log(`📊 Meta Exchange: http://localhost:${port}/api/meta-exchange-token`);
    console.log(`💾 Save Integration: http://localhost:${port}/api/save-integration`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && maxRetries > 0) {
      console.log(`❌ Porta ${port} em uso, tentando porta ${port + 1}...`);
      startServer(port + 1, maxRetries - 1);
    } else {
      console.error('❌ Erro no servidor:', error);
    }
  });

  return server;
};

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:8082'],
  credentials: true
}));
app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  console.log('✅ Health check requisitado');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint para trocar código por token de acesso do Meta
app.post('/api/meta-exchange-token', async (req, res) => {
  console.log('=== INÍCIO REQUISIÇÃO TROCA TOKEN ===');
  console.log('Body recebido:', req.body);
  
  try {
    const { code, redirect_uri, app_id, app_secret } = req.body;

    if (!code || !redirect_uri || !app_id || !app_secret) {
      console.log('❌ Parâmetros faltando!');
      return res.status(400).json({ 
        error: { 
          message: 'Parâmetros obrigatórios faltando: code, redirect_uri, app_id, app_secret' 
        } 
      });
    }

    // Importação dinâmica do node-fetch
    const fetch = await import('node-fetch').then(module => module.default);
    
    // URL da API do Facebook
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${app_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${app_secret}&code=${code}`;

    console.log('🔄 Fazendo requisição para Facebook API...');
    
    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    const data = await response.json();
    console.log('📥 Resposta da API Facebook:', response.status);

    if (!response.ok) {
      console.error('❌ Erro da API do Facebook:', data);
      
      // Tratar erro específico de limite de frequência
      if (data.error?.code === 368) {
        return res.status(429).json({ 
          error: { 
            message: 'Limite de frequência atingido. Aguarde alguns minutos antes de tentar novamente.',
            type: 'RATE_LIMIT',
            details: data.error,
            retryAfter: 300 // 5 minutos em segundos
          } 
        });
      }
      
      return res.status(400).json({ 
        error: { 
          message: data.error?.message || 'Erro ao trocar código por token',
          details: data.error 
        } 
      });
    }

    console.log('✅ Token obtido com sucesso');
    
    // Agora buscar informações da conta do usuário
    console.log('🔍 Buscando informações da conta...');
    
    try {
      // Buscar informações do usuário
      const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${data.access_token}&fields=id,name`);
      const userData = await userResponse.json();
      
      // Buscar contas de anúncios
      const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${data.access_token}&fields=id,name,account_status`);
      const accountsData = await accountsResponse.json();
      
      console.log('👤 Dados do usuário:', userData);
      console.log('💼 Contas de anúncios:', accountsData);
      
      // Selecionar a primeira conta ativa ou a primeira disponível
      let selectedAccount = null;
      if (accountsData.data && accountsData.data.length > 0) {
        selectedAccount = accountsData.data.find(acc => acc.account_status === 1) || accountsData.data[0];
      }
      
      const responseData = {
        access_token: data.access_token,
        token_type: data.token_type || 'bearer',
        expires_in: data.expires_in,
        user_info: userData,
        account_info: selectedAccount ? {
          id: selectedAccount.id,
          name: selectedAccount.name,
          account_status: selectedAccount.account_status
        } : {
          id: `user_${userData.id}`,
          name: userData.name || 'Meta Account',
          account_status: 1
        }
      };
      
      console.log('📤 Enviando resposta completa:', responseData);
      res.json(responseData);
      
    } catch (accountError) {
      console.warn('⚠️ Erro ao buscar informações da conta, enviando dados básicos:', accountError);
      
      // Fallback: retornar com dados básicos
      res.json({
        access_token: data.access_token,
        token_type: data.token_type || 'bearer',
        expires_in: data.expires_in,
        account_info: {
          id: `token_${Date.now()}`,
          name: 'Meta Account',
          account_status: 1
        }
      });
    }

  } catch (error) {
    console.error('💥 Erro interno:', error);
    res.status(500).json({ 
      error: { 
        message: 'Erro interno do servidor',
        details: error.message 
      } 
    });
  }
  console.log('=== FIM REQUISIÇÃO TROCA TOKEN ===');
});

// Endpoint para salvar integração
app.post('/api/save-integration', (req, res) => {
  console.log('📝 Salvando integração:', req.body);
  
  const { 
    workspace_id, 
    platform, 
    access_token, 
    account_id, 
    account_name, 
    is_active, 
    expires_at, 
    settings 
  } = req.body;

  if (!workspace_id || !platform || !access_token) {
    return res.status(400).json({ 
      error: { 
        message: 'Parâmetros obrigatórios faltando: workspace_id, platform, access_token' 
      } 
    });
  }

  console.log('✅ Dados válidos recebidos:', {
    workspace_id,
    platform,
    account_id: account_id || 'N/A',
    account_name: account_name || 'N/A',
    is_active: is_active !== undefined ? is_active : true
  });

  // Simular salvamento bem-sucedido
  res.json({
    success: true,
    message: 'Integração salva com sucesso',
    integration: {
      id: `integration_${Date.now()}`,
      workspace_id,
      platform,
      account_id: account_id || `fallback_${Date.now()}`,
      account_name: account_name || 'Meta Account',
      is_active: is_active !== undefined ? is_active : true,
      expires_at,
      settings,
      created_at: new Date().toISOString()
    }
  });
});

// Campanhas do Meta
app.get('/api/meta-campaigns', (req, res) => {
  console.log('📊 Campanhas requisitadas');
  res.json({
    success: true,
    campaigns: [
      {
        id: '120210000000000001',
        name: '[L] - ENGAJAMENTO - MENSAGEM - IG - 13/08/2025',
        status: 'ACTIVE',
        objective: 'OUTCOME_ENGAGEMENT',
        daily_budget: '15000',
        created_time: '2025-08-13T10:00:00+0000',
        insights: {
          data: [{
            impressions: '41634',
            clicks: '1369',
            spend: '546.11',
            reach: '24454',
            cpm: '13.12',
            cpc: '0.28',
            ctr: '4.73308',
            conversions: '0',
            cost_per_conversion: '0',
            conversion_rate: '0',
            actions: [
              { action_type: 'post_engagement', value: '216' },
              { action_type: 'like', value: '89' },
              { action_type: 'comment', value: '34' },
              { action_type: 'share', value: '23' }
            ]
          }]
        }
      }
    ],
    account_info: {
      id: 'act_363168664437516',
      name: 'Carpiem Semi-Jóias'
    }
  });
});

// Iniciar servidor
const server = startServer(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Parando servidor...');
  server.close(() => {
    console.log('✅ Servidor parado com sucesso!');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('💥 Exceção não capturada:', error);
});
