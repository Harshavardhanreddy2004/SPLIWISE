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
    const authRes = await client.query('SELECT id, email FROM auth.users;');
    const profileRes = await client.query('SELECT id, name, email FROM public.profiles;');

    console.log('--- Auth Users ---');
    authRes.rows.forEach(u => console.log(`ID: ${u.id}, Email: ${u.email}`));

    console.log('\n--- Profiles ---');
    profileRes.rows.forEach(p => console.log(`ID: ${p.id}, Email: ${p.email}, Name: ${p.name}`));

    console.log('\n--- Mismatches ---');
    authRes.rows.forEach(u => {
      const match = profileRes.rows.find(p => p.id === u.id);
      if (!match) {
        console.log(`❌ Auth User ${u.email} (${u.id}) has NO matching Profile in public.profiles!`);
      } else {
        console.log(`✅ Auth User ${u.email} matches Profile ID ${match.id}`);
      }
    });

  } catch (dbErr) {
    console.error('❌ Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
