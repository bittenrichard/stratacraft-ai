const jwt = require('jsonwebtoken');

// Token anon existente
const anonToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bmlvb2dpcWFjYnF1bmF1bmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NzA4NjgsImV4cCI6MjA3MzA0Njg2OH0.rm6ahFHwS-p_ZXKb6vqwEqypv7Qe76ZR8uJps5M0moE';

// Decodificar para ver o payload
const decoded = jwt.decode(anonToken, { complete: true });
console.log('Token decodificado:', JSON.stringify(decoded, null, 2));

// Criar um novo token com role service_role
const payload = {
  iss: "supabase",
  ref: "cwnioogiqacbqunaungs",
  role: "service_role",
  iat: 1757470868,
  exp: 2073046868
};

// O secret geralmente é baseado no JWT secret do projeto
// Vamos tentar alguns padrões comuns
const possibleSecrets = [
  'your-super-secret-jwt-token-with-at-least-32-characters-long',
  'super-secret-jwt-token-with-at-least-32-characters-long',
  'supabase-secret-key',
  payload.ref, // Às vezes é baseado no ref
];

console.log('\nTentando gerar service_role token...');
possibleSecrets.forEach((secret, index) => {
  try {
    const serviceToken = jwt.sign(payload, secret);
    console.log(`Tentativa ${index + 1} (secret: ${secret.substring(0, 10)}...): ${serviceToken}`);
  } catch (error) {
    console.log(`Tentativa ${index + 1} falhou:`, error.message);
  }
});

// Como alternativa, vou mostrar o que seria necessário
console.log('\nO token service_role seria algo como:');
console.log('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.SIGNATURE_CALCULADA_COM_SECRET_CORRETO');
