const { Pool } = require('pg');

// PostgreSQL connection configuration optimized for 110 concurrent users
const pool = new Pool({
  user: process.env.DB_USER || 'discord_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'discord_clone',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  port: parseInt(process.env.DB_PORT || '5432'),
  
  // Connection pool settings untuk handle 110 concurrent users
  max: 25,                    // max 25 connections in pool
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 2000, // timeout for new connections
  
  // SSL configuration for production
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

// Transaction helper
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Query helper with logging in development
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Get a single row or null
async function queryOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Get all rows
async function queryMany(text, params) {
  const result = await query(text, params);
  return result.rows;
}

module.exports = {
  pool,
  query,
  queryOne,
  queryMany,
  withTransaction
};
