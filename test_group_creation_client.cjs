const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ccsgbqbvkqymbsvvplkc.supabase.co';
const supabaseAnonKey = 'sb_publishable_dK-qCX-PZ7idI9DXIARV4w_wrJbeRTk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = 'harsha@gmail.com';
  const password = 'Password123!';

  console.log(`Signing in user: ${email}...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('❌ Sign In Failed:', signInError.message);
    return;
  }

  const user = signInData.user;
  console.log(`✅ User signed in. ID: ${user.id}`);

  // Fetch profile
  console.log('Fetching profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('❌ Failed to fetch profile:', profileError.message);
    return;
  }
  console.log('✅ Profile found:', profile);
}

test();
