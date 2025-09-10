import type { VercelRequest, VercelResponse } from '@vercel/node';

// Troca o code do Meta Ads por um access token
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, redirect_uri } = req.body;
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing code or redirect_uri' });
  }

  const client_id = '707350985805370';
  const client_secret = 'c960b0d5bab06fc898a209ade4435007';

  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token`;
  const params = new URLSearchParams({
    client_id,
    client_secret,
    redirect_uri,
    code,
  });

  try {
    const response = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: 'GET',
    });
    const data = await response.json();
    if (data.access_token) {
      // Aqui você pode salvar o access_token no banco, se desejar
      return res.status(200).json({ access_token: data.access_token, ...data });
    } else {
      return res.status(400).json({ error: data.error || 'No access token returned' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao trocar o code pelo token', details: err });
  }
}
