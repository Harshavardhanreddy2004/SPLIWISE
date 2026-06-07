const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const supabaseUrl = 'ccsgbqbvkqymbsvvplkc.supabase.co';
const dbUser = 'postgres';
const dbName = 'postgres';

console.log('====================================================');
console.log('   SplitFlow Supabase Schema Auto-Migrator');
console.log('====================================================\n');

rl.question('Enter your Supabase Database Password: ', (password) => {
  if (!password.trim()) {
    console.error('Error: Password cannot be empty.');
    rl.close();
    process.exit(1);
  }

  const connectionString = `postgresql://${dbUser}:${encodeURIComponent(password.trim())}@db.${supabaseUrl}:6543/${dbName}?sslmode=require`;

  console.log('\nConnecting to database...');
  const client = new Client({
    connectionString: connectionString,
    connectionTimeoutMillis: 10000,
  });

  client.connect((err) => {
    if (err) {
      console.error('\n❌ Connection Failed!');
      console.error(err.message);
      rl.close();
      process.exit(1);
    }

    console.log('✅ Connected to database successfully.');
    console.log('Reading schema.sql...');

    try {
      const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');

      console.log('Executing SQL migrations (this might take a few seconds)...');
      
      client.query(sql, (queryErr, res) => {
        if (queryErr) {
          console.error('\n❌ Execution Failed!');
          console.error(queryErr.message);
        } else {
          console.log('\n🎉 SQL migrations applied successfully!');
          console.log('Tables, Triggers, and RLS policies are now active.');
        }
        
        client.end(() => {
          rl.close();
        });
      });
    } catch (fsErr) {
      console.error('\n❌ Failed to read schema.sql:');
      console.error(fsErr.message);
      client.end(() => {
        rl.close();
      });
    }
  });
});
