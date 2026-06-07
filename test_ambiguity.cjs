const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ccsgbqbvkqymbsvvplkc.supabase.co';
const supabaseAnonKey = 'sb_publishable_dK-qCX-PZ7idI9DXIARV4w_wrJbeRTk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = 'katlaharshavardhanreddy@gmail.com';
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

  const groupId = '8a9951b2-3247-402e-8b37-61f2f78429c6';

  console.log(`Querying expenses for group ${groupId} using profiles!paid_by(*)...`);
  const { data, error } = await supabase
    .from('expenses')
    .select('*, profiles!paid_by(*), expense_splits(*, profiles(*))')
    .eq('group_id', groupId);

  if (error) {
    console.error('❌ Query Failed:', error);
  } else {
    console.log('✅ Query Succeeded. Found expenses:', JSON.stringify(data, null, 2));
  }
}

test();
