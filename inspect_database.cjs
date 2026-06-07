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

  const sql = `
    SELECT 
      event_object_table AS table_name, 
      trigger_name, 
      event_manipulation AS event, 
      action_statement AS action, 
      action_timing AS timing
    FROM information_schema.triggers;
  `;

  client.query(sql, (qErr, res) => {
    if (qErr) {
      console.error('❌ Query Failed:', qErr.message);
    } else {
      console.log('--- Database Triggers ---');
      res.rows.forEach((row) => {
        console.log(`Table: ${row.table_name}`);
        console.log(`Trigger Name: ${row.trigger_name}`);
        console.log(`Event: ${row.event}`);
        console.log(`Timing: ${row.timing}`);
        console.log(`Action: ${row.action}`);
        console.log('-------------------------');
      });
    }
    client.end();
  });
});
