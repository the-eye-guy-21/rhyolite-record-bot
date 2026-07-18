const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('Missing the DATABASE_URL environment variable.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL connection error:', error);
});

async function testDatabaseConnection() {
  const result = await pool.query(
    'SELECT NOW() AS current_time'
  );

  return result.rows[0].current_time;
}

module.exports = {
  pool,
  testDatabaseConnection,
};
