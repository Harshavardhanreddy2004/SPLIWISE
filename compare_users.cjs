process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Harshamass%402004@db.ccsgbqbvkqymbsvvplkc.supabase.co:6543/postgres?sslmode=require';

const client = new Client({
  connectionString: connectionString,
});

client.connect(async (err) => {
  if (err) {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  }

  try {
    const userRes = await client.query("SELECT * FROM auth.users WHERE email IN ('harsha@gmail.com', 'katlaharshavardhanreddy02@gmail.com');");
    console.log('=== USERS ===');
    userRes.rows.forEach((row) => {
      console.log(`\nEmail: ${row.email}`);
      console.log(JSON.stringify(row, null, 2));
    });

    const identRes = await client.query("SELECT * FROM auth.identities WHERE email IN ('harsha@gmail.com', 'katlaharshavardhanreddy02@gmail.com');");
    console.log('\n=== IDENTITIES ===');
    identRes.rows.forEach((row) => {
      console.log(`\nEmail: ${row.email}`);
      console.log(JSON.stringify(row, null, 2));
    });

  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
