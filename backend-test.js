const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3009;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend funcionando!' });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Teste OK' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor teste rodando na porta ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
});
