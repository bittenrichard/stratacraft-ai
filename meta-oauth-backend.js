import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Habilitar logs detalhados
const debug = true;

const app = express();
app.use(cors());
app.use(express.json());

// Troca o code do Meta Ads por um access token
app.post('/api/meta-exchange-token', async (req, res) => {
  if (debug) {
    console.log('Recebida requisição POST /api/meta-exchange-token');
    console.log('Body:', req.body);
  }

  const { code, redirect_uri } = req.body;
  if (!code || !redirect_uri) {
    console.error('Parâmetros faltando:', { code, redirect_uri });
    return res.status(400).json({ error: 'Missing code or redirect_uri' });
  }

  const client_id = process.env.META_CLIENT_ID || '707350985805370';
  const client_secret = process.env.META_CLIENT_SECRET || 'c960b0d5bab06fc898a209ade4435007';

  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token`;
  const params = new URLSearchParams({
    client_id,
    client_secret,
    redirect_uri,
    code,
  });

  try {
    if (debug) {
      console.log('Fazendo requisição para:', `${tokenUrl}?${params.toString()}`);
    }

    const response = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: 'GET',
    });

    if (debug) {
      console.log('Status da resposta:', response.status);
    }

    const data = await response.json();

    if (debug) {
      console.log('Resposta recebida:', data);
    }

    if (data.access_token) {
      if (debug) {
        console.log('Token recebido com sucesso');
      }
      return res.status(200).json({ access_token: data.access_token, ...data });
    } else {
      console.error('Erro na resposta do Meta:', data.error);
      return res.status(400).json({ error: data.error || 'No access token returned' });
    }
  } catch (err) {
    console.error('Erro ao trocar o code pelo token:', err);
    return res.status(500).json({ error: 'Erro ao trocar o code pelo token', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Meta OAuth backend rodando em http://localhost:${PORT}`);
});
