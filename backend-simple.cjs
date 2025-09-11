console.log('🚀 Iniciando servidor...');

const express = require('express');
const app = express();

app.use(require('cors')());
app.use(express.json());

app.get('/health', (req, res) => {
  console.log('Health check received');
  res.json({ status: 'ok' });
});

app.get('/api/meta-campaigns', (req, res) => {
  console.log('Campaigns requested');
  res.json({ 
    success: true, 
    data: [
      {
        id: '1',
        name: 'Test Campaign',
        status: 'ACTIVE',
        insights: {
          data: [{
            impressions: '1000',
            clicks: '50',
            spend: '100'
          }]
        }
      }
    ]
  });
});

const server = app.listen(3003, () => {
  console.log('✅ Server running on port 3003');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

setInterval(() => {
  console.log('🔄 Server still alive...');
}, 10000);
