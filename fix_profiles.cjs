process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Harshamass%402004@db.ccsgbqbvkqymbsvvplkc.supabase.co:6543/postgres?sslmode=require';
const client = new Client({ connectionString });

function generateSplitID() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'SPL-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

client.connect(async (err) => {
  if (err) {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  }

  try {
    // 1. Get existing auth users
    const authRes = await client.query('SELECT id, email FROM auth.users;');
    console.log('--- Auth Users ---');
    console.log(authRes.rows);

    // 2. For each auth user, check if a profile exists. If not, insert it!
    for (const user of authRes.rows) {
      const pRes = await client.query('SELECT id FROM public.profiles WHERE id = $1;', [user.id]);
      if (pRes.rows.length === 0) {
        const splitId = generateSplitID();
        const fallbackName = user.email.split('@')[0];
        console.log(`Inserting profile for ${user.email} with SplitID: ${splitId}...`);
        
        await client.query(
          `INSERT INTO public.profiles (id, name, email, expense_id) 
           VALUES ($1, $2, $3, $4);`,
          [user.id, fallbackName, user.email, splitId]
        );
        console.log(`✅ Profile created for ${user.email}`);
      } else {
        console.log(`Profile already exists for ${user.email}`);
      }
    }

    // 3. Check triggers in the database
    const triggerRes = await client.query(`
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public' OR event_object_table = 'users';
    `);
    console.log('\n--- Triggers ---');
    console.log(triggerRes.rows);

  } catch (dbErr) {
    console.error('❌ Database operation failed:', dbErr.message);
  } finally {
    client.end();
  }
});
