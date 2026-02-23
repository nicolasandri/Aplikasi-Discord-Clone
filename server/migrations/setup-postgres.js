#!/usr/bin/env node
/**
 * PostgreSQL Setup Script
 * 
 * This script sets up PostgreSQL database:
 * 1. Creates the database schema
 * 2. Migrates data from SQLite (if exists)
 * 3. Creates seed data (if no data exists)
 * 
 * Usage: node setup-postgres.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection config (for admin operations)
const adminConfig = {
  user: process.env.DB_USER || 'discord_user',
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// Database name
const dbName = process.env.DB_NAME || 'discord_clone';

async function setupDatabase() {
  console.log('🚀 Setting up PostgreSQL database...\n');
  
  // Step 1: Create database if not exists
  console.log('📦 Step 1: Creating database (if not exists)...');
  const adminPool = new Pool({ ...adminConfig, database: 'postgres' });
  
  try {
    // Check if database exists
    const dbCheck = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`   ✅ Created database: ${dbName}`);
    } else {
      console.log(`   ℹ️  Database already exists: ${dbName}`);
    }
  } catch (error) {
    console.error('   ⚠️  Could not create database:', error.message);
    console.log('   Make sure PostgreSQL is running and credentials are correct.');
    process.exit(1);
  } finally {
    await adminPool.end();
  }
  
  // Step 2: Connect to the database and create schema
  console.log('\n📋 Step 2: Creating database schema...');
  const pool = new Pool({ ...adminConfig, database: dbName });
  
  try {
    const schemaPath = path.join(__dirname, '001_initial_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('   ❌ Schema file not found:', schemaPath);
      process.exit(1);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL into statements and execute
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }
    
    console.log('   ✅ Database schema created/updated');
  } catch (error) {
    console.error('   ❌ Error creating schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  // Step 3: Migrate data from SQLite
  console.log('\n📤 Step 3: Checking for SQLite data to migrate...');
  const sqlitePath = path.join(__dirname, '../workgrid.db');
  
  if (fs.existsSync(sqlitePath)) {
    console.log('   📂 Found SQLite database, starting migration...');
    const migrationScript = require('./002_migrate_sqlite_to_postgres');
    // The migration script runs automatically when required
  } else {
    console.log('   ℹ️  No SQLite database found, skipping migration');
  }
  
  console.log('\n✅ PostgreSQL setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Update your .env file with PostgreSQL credentials');
  console.log('  2. Update server.js to use database-postgres.js');
  console.log('  3. Start your server: npm start');
}

// Run setup
setupDatabase().catch(console.error);
