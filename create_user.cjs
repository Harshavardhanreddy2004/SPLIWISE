process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Harshamass%402004@db.ccsgbqbvkqymbsvvplkc.supabase.co:6543/postgres?sslmode=require';

const client = new Client({
  connectionString: connectionString,
});

async function main() {
  const email = process.argv[2] || 'harsha@gmail.com';
  const name = process.argv[3] || 'Harsha';
  const password = 'Password123!';

  console.log(`Connecting to database to create user: ${email} (${name})...`);

  client.connect(async (err) => {
    if (err) {
      console.error('❌ Connection Failed:', err.message);
      process.exit(1);
    }

    try {
      // 1. Check if user already exists
      const checkRes = await client.query('SELECT id FROM auth.users WHERE email = $1;', [email]);
      if (checkRes.rows.length > 0) {
        console.log(`⚠️ User with email ${email} already exists in auth.users.`);
        client.end();
        return;
      }

      // 2. Generate UUID
      const uuidRes = await client.query('SELECT gen_random_uuid() AS uuid;');
      const userId = uuidRes.rows[0].uuid;

      // 3. Prepare metadata JSONs
      const appMetaData = JSON.stringify({ provider: 'email', providers: ['email'] });
      const userMetaData = JSON.stringify({
        sub: userId,
        name: name,
        email: email,
        email_verified: true,
        phone_verified: false
      });

      // 4. Insert user
      const sql = `
        INSERT INTO auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_sso_user,
          is_anonymous,
          created_at,
          updated_at
        ) VALUES (
          $1,
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          $2,
          extensions.crypt($3, extensions.gen_salt('bf', 10)),
          NOW(),
          $4::jsonb,
          $5::jsonb,
          false,
          false,
          NOW(),
          NOW()
        ) RETURNING id;
      `;

      const insertRes = await client.query(sql, [userId, email, password, appMetaData, userMetaData]);
      console.log(`\n🎉 User successfully registered in auth.users with ID: ${insertRes.rows[0].id}`);
      
      // Wait 1.5 seconds for the DB trigger to finish profiles creation
      await new Promise(r => setTimeout(r, 1500));

      // 5. Verify profile
      const profileRes = await client.query('SELECT * FROM public.profiles WHERE id = $1;', [userId]);
      if (profileRes.rows.length > 0) {
        console.log('✅ Public profile automatically created by database trigger:');
        console.log(`   SplitID: ${profileRes.rows[0].expense_id}`);
        console.log(`   Name: ${profileRes.rows[0].name}`);
        console.log(`   Email: ${profileRes.rows[0].email}`);
      } else {
        console.warn('⚠️ User was created but public.profiles trigger did not create a profile record.');
      }

    } catch (dbErr) {
      console.error('❌ Failed to create user:', dbErr.message);
    } finally {
      client.end();
    }
  });
}

main();
