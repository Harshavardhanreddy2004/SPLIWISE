const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ccsgbqbvkqymbsvvplkc.supabase.co';
const supabaseAnonKey = 'sb_publishable_dK-qCX-PZ7idI9DXIARV4w_wrJbeRTk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const randomNum = Math.floor(Math.random() * 100000);
  const email = `testuser_${randomNum}@gmail.com`;
  const password = 'Password123!';
  const name = `Test User ${randomNum}`;

  console.log(`Attempting to sign up user: ${email} (${name})...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    console.error('❌ Sign Up Failed:', error);
  } else {
    console.log('✅ Sign Up Succeeded:', data);
  }
}

test();
