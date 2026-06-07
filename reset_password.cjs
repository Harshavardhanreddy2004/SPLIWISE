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
      SET encrypted_password = extensions.crypt('Password123!', extensions.gen_salt('bf', 10)) 
      WHERE email = 'katlaharshavardhanreddy02@gmail.com';
    `);
    console.log('✅ Password reset successful:', res.rowCount, 'row(s) updated.');
  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
