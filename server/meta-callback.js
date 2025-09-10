const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const supabase = require('./supabase');
const metaRoutes = require('./routes/meta');

dotenv.config();

const app = express();

// Rotas do Meta
app.use('/api', metaRoutes);

// Configuração do CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Adiciona headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.post('/api/meta-exchange-token', async (req, res) => {
  try {
    console.log('Recebida requisição POST /api/meta-exchange-token');
    console.log('Body:', req.body);
    
    const { code, redirect_uri } = req.body;
    
    if (!code) {
      throw new Error('Código não fornecido');
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
    
    // Função de retry com delay exponencial
    const makeRequest = async (attempt = 1) => {
      try {
        const response = await fetch(tokenUrl);
        console.log('Status da resposta:', response.status);
        
        const data = await response.json();
        console.log('Resposta recebida:', data);
        
        if (!response.ok) {
          // Se for rate limit e ainda não excedeu tentativas
          if (data.error?.code === 368 && attempt < 3) {
            const delay = Math.pow(2, attempt) * 1000; // Delay exponencial
            console.log(`Aguardando ${delay}ms antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1);
          }
          
          console.error('Erro na resposta do Meta:', data);
          if (data.error && data.error.message) {
            throw new Error(data.error.message);
          } else if (data.error_message) {
            throw new Error(data.error_message);
          } else {
            throw new Error('Erro ao trocar código por token');
          }
        }
        
        return data;
      } catch (error) {
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Erro na tentativa ${attempt}, aguardando ${delay}ms antes de tentar novamente...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(attempt + 1);
        }
        throw error;
      }
    };

    const data = await makeRequest();

    // Busca informações da conta do Meta
    const accountInfo = await fetch('https://graph.facebook.com/v19.0/me/adaccounts', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    }).then(res => res.json());

    // Salva a integração no Supabase
    const { error: dbError } = await supabase
      .from('ad_integrations')
      .insert({
        platform: 'meta',
        access_token: data.access_token,
        account_id: accountInfo.data[0]?.account_id,
        account_name: accountInfo.data[0]?.name,
        is_active: true,
        expires_at: new Date(Date.now() + (data.expires_in * 1000)).toISOString()
      });

    if (dbError) {
      console.error('Erro ao salvar integração:', dbError);
      throw new Error('Erro ao salvar integração no banco de dados');
    }

    res.json({ 
      ...data,
      account_info: accountInfo.data[0]
    });
  } catch (error) {
    console.error('Erro ao trocar código por token:', error);
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
