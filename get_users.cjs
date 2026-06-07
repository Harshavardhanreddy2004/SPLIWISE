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

  client.query('SELECT id, name, email, expense_id FROM public.profiles LIMIT 5;', (qErr, res) => {
    if (qErr) {
      console.error('❌ Query Failed:', qErr.message);
    } else {
      console.log('--- Profiles ---');
      res.rows.forEach((row) => {
        console.log(`ID: ${row.id}`);
        console.log(`Name: ${row.name}`);
        console.log(`Email: ${row.email}`);
        console.log(`Expense ID: ${row.expense_id}`);
        console.log('----------------');
      });
    }
    client.end();
  });
});
