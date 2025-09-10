import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import OpenAI from "https://deno.land/x/openai@v4.33.0/mod.ts";

// IMPORTANTE: Adicione sua chave da OpenAI como uma variável de ambiente no Supabase
// Vá para Project Settings > Edge Functions > Add new secret
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { platform, product, objective, budget, audience } = await req.json();

    if (!platform || !product || !objective || !budget) {
        throw new Error("Plataforma, produto, objetivo e orçamento são obrigatórios.");
    }

    const prompt = `
      Crie uma campanha de marketing completa para a plataforma ${platform}.
      Produto/Serviço: ${product}
      Objetivo: ${objective}
      Orçamento Diário: R$ ${budget}
      Público-Alvo: ${audience || 'Não especificado, por favor sugira um público-alvo detalhado com base no produto.'}

      Sua resposta DEVE ser um objeto JSON com a seguinte estrutura, sem nenhum texto adicional antes ou depois do JSON:
      {
        "title": "Um título criativo e curto para a campanha",
        "platform": "${platform}",
        "copy": "Um texto de anúncio (copy) persuasivo, com emojis, quebras de linha e otimizado para a plataforma. Deve ter no máximo 3 frases.",
        "targeting": "Uma descrição detalhada da segmentação de público recomendada (interesses, demografia, comportamentos).",
        "keywords": ["uma", "lista", "de", "5", "palavras-chave", "relevantes", "se a plataforma for Google Ads"],
        "predicted_results": {
            "reach": "Estimativa de alcance diário (ex: '10k - 15k')",
            "ctr": "Estimativa de CTR (ex: '1.5% - 2.5%')",
            "cpa": "Estimativa de Custo por Aquisição (ex: 'R$ 15,00 - R$ 25,00')"
        }
      }
    `;

    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4-turbo",
        response_format: { type: "json_object" },
    });

    const creative = JSON.parse(chatCompletion.choices[0].message.content || '{}');

    return new Response(JSON.stringify(creative), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})