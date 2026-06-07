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
    const salt = await client.query("SELECT extensions.gen_salt('bf', 10) as salt;");
    const saltVal = salt.rows[0].salt;

    const hashRes = await client.query("SELECT extensions.crypt('Password123!', $1) as hash;", [saltVal]);
    const hash = hashRes.rows[0].hash;

    // Update first user
    const res1 = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = $1, email_confirmed_at = NOW() 
      WHERE email = 'katlaharshavardhanreddy@gmail.com';
    `, [hash]);
    console.log(`✅ katlaharshavardhanreddy@gmail.com updated: ${res1.rowCount} row(s).`);

    // Update second user
    const res2 = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = $1, email_confirmed_at = NOW() 
      WHERE email = 'katlaharshavardhanreddy02@gmail.com';
    `, [hash]);
    console.log(`✅ katlaharshavardhanreddy02@gmail.com updated: ${res2.rowCount} row(s).`);

  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
