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
  console.log('✅ Connected to database.');

  try {
    await client.query('BEGIN;');

    // Simulate PostgREST authenticated state
    await client.query("SET LOCAL role = 'authenticated';");
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "243fd660-e604-4220-aaa9-09e353596029"}';`);

    console.log("Attempting insert into public.groups...");
    const res = await client.query(
      `INSERT INTO public.groups (name, type, created_by) VALUES ($1, $2, $3) RETURNING *;`,
      ['Test Group 123', 'trip', '243fd660-e604-4220-aaa9-09e353596029']
    );

    console.log('🎉 Insert Succeeded!');
    console.log('Inserted Row:', res.rows[0]);

  } catch (dbErr) {
    console.error('❌ Insertion Failed with Error:');
    console.error(dbErr.message);
    console.error('Error Details:', dbErr);
  } finally {
    console.log('Rolling back transaction...');
    await client.query('ROLLBACK;');
    client.end();
  }
});
