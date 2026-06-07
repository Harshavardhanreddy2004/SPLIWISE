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
    // Start transaction and set local settings
    await client.query('BEGIN;');
    await client.query("SET LOCAL role = 'authenticated';");
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "243fd660-e604-4220-aaa9-09e353596029"}';`);

    const res = await client.query('SELECT auth.uid() AS uid;');
    console.log('auth.uid() returned:', res.rows[0].uid);
    
    await client.query('COMMIT;');
  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
