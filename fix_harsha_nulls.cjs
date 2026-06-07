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
    const res = await client.query(`
      UPDATE auth.users 
      SET 
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = ''
      WHERE email = 'harsha@gmail.com';
    `);
    console.log(`✅ harsha@gmail.com updated: ${res.rowCount} row(s).`);
  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
