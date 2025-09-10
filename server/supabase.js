const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mlzflbyxwvunulnocrpb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Configurações do Supabase ausentes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
