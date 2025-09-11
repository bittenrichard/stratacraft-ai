const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3012;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  console.log('Health check requisitado');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/meta-campaigns', (req, res) => {
  console.log('Campanhas requisitadas');
  res.json({
    success: true,
    campaigns: [
      {
        id: '23851234567890123',
        name: '[L] - ENGAJAMENTO - MENSAGEM - IG - 13/08/2025',
        status: 'ACTIVE',
        objective: 'OUTCOME_ENGAGEMENT',
        created_time: '2024-08-13T10:30:00Z',
        insights: {
          data: [{
            impressions: '41634',
            clicks: '1369',
            spend: '546.11',
            reach: '24454',
            cpm: '13.12',
            cpc: '0.28',
            ctr: '4.73308',
            actions: [
              { action_type: 'post_engagement', value: '216' },
              { action_type: 'like', value: '89' },
              { action_type: 'comment', value: '34' },
              { action_type: 'share', value: '23' }
            ]
          }]
        }
      },
      {
        id: '23851234567890124',
        name: '[VIEW VÍDEO] - FEED/REELS - 03/07',
        status: 'ACTIVE',
        objective: 'VIDEO_VIEWS',
        created_time: '2024-07-03T14:20:00Z',
        insights: {
          data: [{
            impressions: '125847',
            clicks: '8392',
            spend: '423.67',
            reach: '89234',
            cpm: '3.37',
            cpc: '0.05',
            ctr: '6.67',
            actions: [
              { action_type: 'video_view', value: '36272' },
              { action_type: 'video_play_actions', value: '28934' }
            ]
          }]
        }
      },
      {
        id: '23851234567890125',
        name: 'Conversão - Vendas Online',
        status: 'PAUSED',
        objective: 'CONVERSIONS',
        created_time: '2024-08-01T09:15:00Z',
        insights: {
          data: [{
            impressions: '4567',
            clicks: '234',
            spend: '1234.56',
            reach: '3456',
            cpm: '12.99',
            cpc: '0.27',
            ctr: '4.80',
            actions: [
              { action_type: 'purchase', value: '78' },
              { action_type: 'add_to_cart', value: '145' }
            ]
          }]
        }
      }
    ],
    account: {
      id: 'act_363168664437516',
      name: 'Carpiem Semi-Jóias'
    }
  });
});

// Endpoint para trocar código por token de acesso do Meta
app.post('/api/meta-exchange-token', async (req, res) => {
  console.log('=== INÍCIO REQUISIÇÃO TROCA TOKEN ===');
  console.log('Solicitação de troca de token recebida:', req.body);
  console.log('Headers:', req.headers);
  
  try {
    const { code, redirect_uri, app_id, app_secret } = req.body;

    console.log('Parâmetros extraídos:', { code: code ? 'PRESENTE' : 'AUSENTE', redirect_uri, app_id: app_id ? 'PRESENTE' : 'AUSENTE', app_secret: app_secret ? 'PRESENTE' : 'AUSENTE' });

    if (!code || !redirect_uri || !app_id || !app_secret) {
      console.log('❌ Parâmetros faltando!');
      return res.status(400).json({ 
        error: { 
          message: 'Parâmetros obrigatórios faltando: code, redirect_uri, app_id, app_secret' 
        } 
      });
    }

    // URL da API do Facebook para trocar código por token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${app_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${app_secret}&code=${code}`;

    console.log('🔄 Fazendo requisição para Facebook API...');
    console.log('URL (sem secret):', tokenUrl.replace(app_secret, '***SECRET***'));
    
    // Fazer requisição para a API do Facebook
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    const data = await response.json();
    console.log('📥 Resposta da API Facebook:', response.status, response.statusText);
    console.log('📄 Dados da resposta:', data);

    if (!response.ok) {
      console.error('❌ Erro da API do Facebook:', data);
      return res.status(400).json({ 
        error: { 
          message: data.error?.message || 'Erro ao trocar código por token',
          details: data.error 
        } 
      });
    }

    console.log('✅ Token obtido com sucesso');
    
    // Retornar o token de acesso
    res.json({
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in
    });

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

// Endpoint para salvar integração no Supabase
app.post('/api/save-integration', async (req, res) => {
  console.log('Solicitação para salvar integração:', req.body);
  
  try {
    const { workspace_id, platform, access_token, platform_data } = req.body;

    if (!workspace_id || !platform || !access_token) {
      return res.status(400).json({ 
        error: { 
          message: 'Parâmetros obrigatórios faltando: workspace_id, platform, access_token' 
        } 
      });
    }

    // Simular salvamento bem-sucedido (em produção, salvar no Supabase)
    console.log('Salvando integração:', {
      workspace_id,
      platform,
      platform_data: platform_data?.account_id || 'N/A'
    });

    // Por enquanto, apenas simular sucesso
    res.json({
      success: true,
      message: 'Integração salva com sucesso',
      integration: {
        id: `integration_${Date.now()}`,
        workspace_id,
        platform,
        is_active: true,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao salvar integração:', error);
    res.status(500).json({ 
      error: { 
        message: 'Erro interno do servidor',
        details: error.message 
      } 
    });
  }
});

console.log(`Tentando iniciar servidor na porta ${PORT}...`);

app.listen(PORT, (err) => {
  if (err) {
    console.error('Erro ao iniciar servidor:', err);
    return;
  }
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Campanhas: http://localhost:${PORT}/api/meta-campaigns`);
});

process.on('error', (error) => {
  console.error('Erro no processo:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Exceção não capturada:', error);
});
