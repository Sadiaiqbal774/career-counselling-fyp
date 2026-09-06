const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not configured in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function initDatabase() {
  try {
    // Read the init.sql file
    const sqlPath = __dirname + '/sql/init.sql';
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log('✓ Database schema initialized successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('✗ Error initializing database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
