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
    const expensesRes = await client.query('SELECT * FROM public.expenses;');
    const splitsRes = await client.query('SELECT * FROM public.expense_splits;');

    console.log('--- Expenses and Splits ---');
    console.log(`Expenses (${expensesRes.rows.length}):`);
    console.log(expensesRes.rows);

    console.log(`\nSplits (${splitsRes.rows.length}):`);
    console.log(splitsRes.rows);

  } catch (dbErr) {
    console.error('❌ Database Query Failed:', dbErr.message);
  } finally {
    client.end();
  }
});
