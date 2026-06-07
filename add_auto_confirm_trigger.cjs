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
    console.log('1. Confirming all existing unconfirmed users...');
    const updateRes = await client.query(`
      UPDATE auth.users 
      SET 
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, '')
      WHERE email_confirmed_at IS NULL
      RETURNING id, email;
    `);
    console.log(`✅ Confirmed ${updateRes.rows.length} existing user(s):`);
    updateRes.rows.forEach(u => console.log(`   - ${u.email} (${u.id})`));

    console.log('\n2. Creating auto-confirm trigger function in public schema...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.auto_confirm_user()
      RETURNS trigger AS $$
      BEGIN
        NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
        NEW.confirmation_token := COALESCE(NEW.confirmation_token, '');
        NEW.recovery_token := COALESCE(NEW.recovery_token, '');
        NEW.email_change_token_new := COALESCE(NEW.email_change_token_new, '');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('✅ Trigger function created.');

    console.log('\n3. Creating database trigger on auth.users...');
    await client.query('DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;');
    await client.query(`
      CREATE TRIGGER tr_auto_confirm_user
        BEFORE INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.auto_confirm_user();
    `);
    console.log('✅ Trigger tr_auto_confirm_user created on auth.users.');

    // 4. Double check profiles table trigger and see if we have any other unmapped profiles
    console.log('\n4. Verifying profiles mapping...');
    const checkRes = await client.query('SELECT id, email FROM auth.users;');
    const profileRes = await client.query('SELECT id, name, email FROM public.profiles;');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (const user of checkRes.rows) {
      const match = profileRes.rows.find(p => p.id === user.id);
      if (!match) {
        let splitId = 'SPL-';
        for (let i = 0; i < 6; i++) {
          splitId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const fallbackName = user.email.split('@')[0];
        console.log(`   ⚠️ Mapping missing profile for: ${user.email} -> ${splitId}...`);
        await client.query(
          `INSERT INTO public.profiles (id, name, email, expense_id) 
           VALUES ($1, $2, $3, $4);`,
          [user.id, fallbackName, user.email, splitId]
        );
      }
    }
    console.log('✅ Profiles verification finished. All user accounts have matching public profiles.');

  } catch (dbErr) {
    console.error('❌ Database operation failed:', dbErr.message);
  } finally {
    client.end();
  }
});
