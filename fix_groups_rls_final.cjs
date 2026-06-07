process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Harshamass%402004@db.ccsgbqbvkqymbsvvplkc.supabase.co:6543/postgres?sslmode=require';

const client = new Client({
  connectionString: connectionString,
});

client.connect((err) => {
  if (err) {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database.');

  const sql = `
    -- 1. Alter groups table to default created_by to the authenticated user's ID
    ALTER TABLE public.groups ALTER COLUMN created_by SET DEFAULT auth.uid();

    -- 2. Re-create the groups INSERT policy to be open for authenticated users
    DROP POLICY IF EXISTS "Allow authenticated users to create groups" ON public.groups;
    CREATE POLICY "Allow authenticated users to create groups"
      ON public.groups FOR INSERT
      TO authenticated
      WITH CHECK (true);
  `;

  client.query(sql, (qErr) => {
    if (qErr) {
      console.error('❌ SQL Migration Failed:', qErr.message);
    } else {
      console.log('🎉 Groups RLS insert policy and default created_by updated successfully!');
    }
    client.end();
  });
});
