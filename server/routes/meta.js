const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Middleware para verificar o token de acesso
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  req.accessToken = authHeader.split(' ')[1];
  next();
};

// Rota para buscar campanhas
router.get('/meta-campaigns', requireAuth, async (req, res) => {
  try {
    // Busca as campanhas ativas
    const campaignsResponse = await fetch(
      'https://graph.facebook.com/v19.0/act_${accountId}/campaigns',
      {
        headers: {
          'Authorization': `Bearer ${req.accessToken}`
        }
      }
    );

    if (!campaignsResponse.ok) {
      const error = await campaignsResponse.json();
      throw new Error(error.error?.message || 'Erro ao buscar campanhas');
    }

    const campaignsData = await campaignsResponse.json();
    
    // Para cada campanha, busca os insights
    const campaignsWithInsights = await Promise.all(
      campaignsData.data.map(async (campaign) => {
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v19.0/${campaign.id}/insights?fields=spend,reach,impressions,results`,
          {
            headers: {
              'Authorization': `Bearer ${req.accessToken}`
            }
          }
        );

        const insightsData = await insightsResponse.json();
        const insights = insightsData.data?.[0] || {};

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          budget: campaign.daily_budget || campaign.lifetime_budget || 0,
          spend: parseFloat(insights.spend || 0),
          reach: parseInt(insights.reach || 0),
          impressions: parseInt(insights.impressions || 0),
          results: parseInt(insights.results || 0),
          start_time: campaign.start_time,
          end_time: campaign.end_time || null
        };
      })
    );

    res.json({ campaigns: campaignsWithInsights });
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
