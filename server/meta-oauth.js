import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração para rate limiting
const META_RETRY_DELAY = 1000; // 1 segundo entre tentativas
const META_MAX_RETRIES = 3; // Máximo de 3 tentativas

// Função para trocar o código pelo token com retry e delay
async function exchangeCodeForToken(code, redirectUri, retryCount = 0) {
  try {
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code: code
    });

    const response = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro na resposta do Meta:', error);
      
      // Se receber erro de rate limit e ainda tiver tentativas
      if (error.code === 368 && retryCount < META_MAX_RETRIES) {
        console.log(`Tentativa ${retryCount + 1}/${META_MAX_RETRIES} - Aguardando ${META_RETRY_DELAY}ms...`);
        await setTimeout(META_RETRY_DELAY);
        return exchangeCodeForToken(code, redirectUri, retryCount + 1);
      }
      
      throw new Error(error.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (retryCount < META_MAX_RETRIES) {
      console.log(`Erro na tentativa ${retryCount + 1}. Tentando novamente em ${META_RETRY_DELAY}ms...`);
      await setTimeout(META_RETRY_DELAY);
      return exchangeCodeForToken(code, redirectUri, retryCount + 1);
    }
    throw error;
  }
}

app.post('/api/meta-exchange-token', async (req, res) => {
  try {
    console.log('Recebida requisição POST /api/meta-exchange-token');
    console.log('Body:', req.body);
    
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      throw new Error('Código e redirect_uri são obrigatórios');
    }

    const data = await exchangeCodeForToken(code, redirect_uri);
    res.json(data);
  } catch (error) {
    console.error('Erro ao trocar código por token:', error);
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
