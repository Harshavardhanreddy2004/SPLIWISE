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
    const res = await client.query('SELECT email FROM auth.users;');
    res.rows.forEach((row) => {
      console.log(`Email: [${row.email}] (Length: ${row.email ? row.email.length : 0})`);
    });
  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
