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
    // 1. Get harsha's user ID
    const userRes = await client.query("SELECT id FROM auth.users WHERE email = 'harsha@gmail.com';");
    if (userRes.rows.length === 0) {
      console.log('⚠️ harsha@gmail.com user not found in auth.users.');
      client.end();
      return;
    }
    const userId = userRes.rows[0].id;
    console.log(`Found User ID for harsha@gmail.com: ${userId}`);

    // 2. Check if identity already exists
    const identRes = await client.query("SELECT id FROM auth.identities WHERE user_id = $1;", [userId]);
    if (identRes.rows.length > 0) {
      console.log('⚠️ Identity record already exists for this user.');
      client.end();
      return;
    }

    // 3. Insert identity record
    const identityData = JSON.stringify({
      sub: userId,
      email: 'harsha@gmail.com',
      email_verified: true,
      phone_verified: false
    });

    const sql = `
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1::uuid,
        $1::text,
        $2::jsonb,
        'email',
        NOW(),
        NOW()
      );
    `;

    await client.query(sql, [userId, identityData]);
    console.log('🎉 Missing auth.identities record successfully created!');

  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
