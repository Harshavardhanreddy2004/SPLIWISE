process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Harshamass%402004@db.ccsgbqbvkqymbsvvplkc.supabase.co:6543/postgres?sslmode=require';
const client = new Client({ connectionString });

client.connect(async (err) => {
  if (err) {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  }

  try {
    const res = await client.query('SELECT id, email, email_confirmed_at, confirmed_at FROM auth.users;');
    console.log('--- User Confirmation Status ---');
    res.rows.forEach(r => {
      console.log(`Email: ${r.email}`);
      console.log(`  email_confirmed_at: ${r.email_confirmed_at}`);
      console.log(`  confirmed_at: ${r.confirmed_at}`);
    });
  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
