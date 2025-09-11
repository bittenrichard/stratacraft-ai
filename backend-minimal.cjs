const express = require('express');

const app = express();
const PORT = 3003;

// Log de inicialização
console.log('🚀 Iniciando servidor minimal...');

// Endpoint básico
app.get('/', (req, res) => {
  console.log('📡 Requisição recebida na raiz');
  res.send('Backend funcionando!');
});

app.get('/health', (req, res) => {
  console.log('📊 Health check');
  res.json({ status: 'ok' });
});

// Iniciar servidor
app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Servidor rodando em http://127.0.0.1:${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`🔗 Ou: http://127.0.0.1:${PORT}`);
});

// Log de erros
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});
