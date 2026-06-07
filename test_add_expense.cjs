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

  const profile = signInData.user;
  console.log(`✅ User signed in. ID: ${profile.id}`);

  const groupId = '8a9951b2-3247-402e-8b37-61f2f78429c6';
  const title = 'Groceries';
  const amount = 50;

  console.log(`1. Inserting expense "${title}" (${amount}) for group ${groupId}...`);
  const { data: expense, error: expError } = await supabase
    .from('expenses')
    .insert({
      group_id: groupId,
      title,
      amount,
      paid_by: profile.id,
      created_by: profile.id,
      split_type: 'equal',
      notes: 'Weekly grocery run',
    })
    .select()
    .single();

  if (expError) {
    console.error('❌ Expense insertion failed:', expError);
    return;
  }

  console.log('✅ Expense inserted successfully:', expense);

  // Splits: split equally between the creator and the other member (Manideep: 01ad0b5a-cc80-4302-9253-b98340e70497)
  const splitsPayload = [
    {
      expense_id: expense.id,
      profile_id: profile.id,
      amount: 25,
    },
    {
      expense_id: expense.id,
      profile_id: '01ad0b5a-cc80-4302-9253-b98340e70497',
      amount: 25,
    }
  ];

  console.log('2. Inserting splits...');
  const { data: splitsData, error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splitsPayload)
    .select();

  if (splitsError) {
    console.error('❌ Splits insertion failed:', splitsError);
    return;
  }

  console.log('✅ Splits inserted successfully:', splitsData);
}

test();
