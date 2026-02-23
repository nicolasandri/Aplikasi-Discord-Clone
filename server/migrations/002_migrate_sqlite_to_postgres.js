#!/usr/bin/env node
/**
 * Migration Script: SQLite to PostgreSQL
 * 
 * This script migrates all data from SQLite to PostgreSQL.
 * Run this after creating the PostgreSQL schema.
 * 
 * Usage: node 002_migrate_sqlite_to_postgres.js
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// SQLite database path
const sqliteDbPath = path.join(__dirname, '../workgrid.db');

// PostgreSQL connection
const pgConfig = {
  user: process.env.DB_USER || 'discord_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'discord_clone',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(pgConfig);

// Progress tracking
const stats = {
  users: 0,
  servers: 0,
  server_members: 0,
  categories: 0,
  channels: 0,
  messages: 0,
  reactions: 0,
  friendships: 0,
  dm_channels: 0,
  dm_messages: 0,
  invites: 0,
  bans: 0,
};

async function migrate() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n');
  
  // Check if SQLite database exists
  const fs = require('fs');
  if (!fs.existsSync(sqliteDbPath)) {
    console.log('⚠️  SQLite database not found at:', sqliteDbPath);
    console.log('   Skipping migration. PostgreSQL will start with fresh data.');
    process.exit(0);
  }
  
  // Connect to SQLite
  console.log('📂 Connecting to SQLite database...');
  const sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY);
  
  // Helper function to query SQLite
  const sqliteQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  // Helper function to insert into PostgreSQL
  const pgInsert = async (table, columns, values, conflictColumn = null) => {
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    if (conflictColumn) {
      sql += ` ON CONFLICT (${conflictColumn}) DO NOTHING`;
    }
    await pool.query(sql, values);
  };

  try {
    // Test PostgreSQL connection
    console.log('🐘 Testing PostgreSQL connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL\n');
    
    // ============================================================
    // MIGRATE USERS
    // ============================================================
    console.log('👥 Migrating users...');
    const users = await sqliteQuery('SELECT * FROM users');
    for (const user of users) {
      await pgInsert(
        'users',
        ['id', 'username', 'email', 'password', 'avatar', 'status', 'created_at', 'updated_at'],
        [
          user.id,
          user.username,
          user.email,
          user.password,
          user.avatar,
          user.status || 'offline',
          user.created_at || new Date(),
          user.created_at || new Date()
        ],
        'id'
      );
      stats.users++;
    }
    console.log(`   ✅ Migrated ${stats.users} users\n`);
    
    // ============================================================
    // MIGRATE SERVERS
    // ============================================================
    console.log('🏢 Migrating servers...');
    const servers = await sqliteQuery('SELECT * FROM servers');
    for (const server of servers) {
      await pgInsert(
        'servers',
        ['id', 'name', 'icon', 'owner_id', 'created_at', 'updated_at'],
        [
          server.id,
          server.name,
          server.icon,
          server.owner_id,
          server.created_at || new Date(),
          server.created_at || new Date()
        ],
        'id'
      );
      stats.servers++;
    }
    console.log(`   ✅ Migrated ${stats.servers} servers\n`);
    
    // ============================================================
    // MIGRATE SERVER MEMBERS
    // ============================================================
    console.log('👤 Migrating server members...');
    const members = await sqliteQuery('SELECT * FROM server_members');
    for (const member of members) {
      await pgInsert(
        'server_members',
        ['id', 'server_id', 'user_id', 'role', 'joined_at'],
        [
          member.id,
          member.server_id,
          member.user_id,
          member.role || 'member',
          member.joined_at || new Date()
        ],
        'id'
      );
      stats.server_members++;
    }
    console.log(`   ✅ Migrated ${stats.server_members} server members\n`);
    
    // ============================================================
    // MIGRATE CATEGORIES
    // ============================================================
    console.log('📁 Migrating categories...');
    const categories = await sqliteQuery('SELECT * FROM categories');
    for (const cat of categories) {
      await pgInsert(
        'categories',
        ['id', 'server_id', 'name', 'position', 'created_at'],
        [
          cat.id,
          cat.server_id,
          cat.name,
          cat.position || 0,
          cat.created_at || new Date()
        ],
        'id'
      );
      stats.categories++;
    }
    console.log(`   ✅ Migrated ${stats.categories} categories\n`);
    
    // ============================================================
    // MIGRATE CHANNELS
    // ============================================================
    console.log('📢 Migrating channels...');
    const channels = await sqliteQuery('SELECT * FROM channels');
    for (const channel of channels) {
      await pgInsert(
        'channels',
        ['id', 'server_id', 'category_id', 'name', 'type', 'position', 'created_at'],
        [
          channel.id,
          channel.server_id,
          channel.category_id || null,
          channel.name,
          channel.type || 'text',
          channel.position || 0,
          channel.created_at || new Date()
        ],
        'id'
      );
      stats.channels++;
    }
    console.log(`   ✅ Migrated ${stats.channels} channels\n`);
    
    // ============================================================
    // MIGRATE MESSAGES
    // ============================================================
    console.log('💬 Migrating messages...');
    const messages = await sqliteQuery('SELECT * FROM messages');
    let messageCount = 0;
    const batchSize = 1000;
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      let attachments = '[]';
      if (msg.attachments) {
        try {
          // Ensure valid JSON
          const parsed = JSON.parse(msg.attachments);
          attachments = JSON.stringify(parsed);
        } catch (e) {
          attachments = '[]';
        }
      }
      
      await pgInsert(
        'messages',
        ['id', 'channel_id', 'user_id', 'content', 'reply_to_id', 'attachments', 'created_at', 'edited_at'],
        [
          msg.id,
          msg.channel_id,
          msg.user_id,
          msg.content || '',
          msg.reply_to_id || null,
          attachments,
          msg.created_at || new Date(),
          msg.edited_at || null
        ],
        'id'
      );
      
      messageCount++;
      stats.messages++;
      
      // Progress indicator for large message tables
      if (messageCount % batchSize === 0) {
        console.log(`   📊 Progress: ${messageCount}/${messages.length} messages...`);
      }
    }
    console.log(`   ✅ Migrated ${stats.messages} messages\n`);
    
    // ============================================================
    // MIGRATE REACTIONS
    // ============================================================
    console.log('😀 Migrating reactions...');
    const reactions = await sqliteQuery('SELECT * FROM reactions');
    for (const reaction of reactions) {
      await pgInsert(
        'reactions',
        ['id', 'message_id', 'user_id', 'emoji', 'created_at'],
        [
          reaction.id,
          reaction.message_id,
          reaction.user_id,
          reaction.emoji,
          reaction.created_at || new Date()
        ],
        'id'
      );
      stats.reactions++;
    }
    console.log(`   ✅ Migrated ${stats.reactions} reactions\n`);
    
    // ============================================================
    // MIGRATE FRIENDSHIPS
    // ============================================================
    console.log('🤝 Migrating friendships...');
    const friendships = await sqliteQuery('SELECT * FROM friendships');
    for (const f of friendships) {
      await pgInsert(
        'friendships',
        ['id', 'user_id', 'friend_id', 'status', 'created_at', 'updated_at'],
        [
          f.id,
          f.user_id,
          f.friend_id,
          f.status || 'pending',
          f.created_at || new Date(),
          f.updated_at || f.created_at || new Date()
        ],
        'id'
      );
      stats.friendships++;
    }
    console.log(`   ✅ Migrated ${stats.friendships} friendships\n`);
    
    // ============================================================
    // MIGRATE DM CHANNELS
    // ============================================================
    console.log('💌 Migrating DM channels...');
    const dmChannels = await sqliteQuery('SELECT * FROM dm_channels');
    for (const dm of dmChannels) {
      await pgInsert(
        'dm_channels',
        ['id', 'user1_id', 'user2_id', 'created_at', 'updated_at'],
        [
          dm.id,
          dm.user1_id,
          dm.user2_id,
          dm.created_at || new Date(),
          dm.updated_at || dm.created_at || new Date()
        ],
        'id'
      );
      stats.dm_channels++;
    }
    console.log(`   ✅ Migrated ${stats.dm_channels} DM channels\n`);
    
    // ============================================================
    // MIGRATE DM MESSAGES
    // ============================================================
    console.log('💌 Migrating DM messages...');
    const dmMessages = await sqliteQuery('SELECT * FROM dm_messages');
    let dmMessageCount = 0;
    
    for (const msg of dmMessages) {
      let attachments = '[]';
      if (msg.attachments) {
        try {
          const parsed = JSON.parse(msg.attachments);
          attachments = JSON.stringify(parsed);
        } catch (e) {
          attachments = '[]';
        }
      }
      
      await pgInsert(
        'dm_messages',
        ['id', 'channel_id', 'sender_id', 'content', 'attachments', 'is_read', 'created_at', 'edited_at'],
        [
          msg.id,
          msg.channel_id,
          msg.sender_id,
          msg.content || '',
          attachments,
          msg.is_read === 1 || msg.is_read === true,
          msg.created_at || new Date(),
          msg.edited_at || null
        ],
        'id'
      );
      
      dmMessageCount++;
      stats.dm_messages++;
      
      if (dmMessageCount % batchSize === 0) {
        console.log(`   📊 Progress: ${dmMessageCount}/${dmMessages.length} DM messages...`);
      }
    }
    console.log(`   ✅ Migrated ${stats.dm_messages} DM messages\n`);
    
    // ============================================================
    // MIGRATE INVITES
    // ============================================================
    console.log('🔗 Migrating invites...');
    const invites = await sqliteQuery('SELECT * FROM invites');
    for (const invite of invites) {
      await pgInsert(
        'invites',
        ['id', 'server_id', 'code', 'created_by', 'expires_at', 'max_uses', 'uses', 'created_at'],
        [
          invite.id,
          invite.server_id,
          invite.code,
          invite.created_by,
          invite.expires_at || null,
          invite.max_uses || null,
          invite.uses || 0,
          invite.created_at || new Date()
        ],
        'id'
      );
      stats.invites++;
    }
    console.log(`   ✅ Migrated ${stats.invites} invites\n`);
    
    // ============================================================
    // MIGRATE BANS
    // ============================================================
    console.log('🚫 Migrating bans...');
    const bans = await sqliteQuery('SELECT * FROM bans');
    for (const ban of bans) {
      await pgInsert(
        'bans',
        ['id', 'server_id', 'user_id', 'reason', 'created_at'],
        [
          ban.id,
          ban.server_id,
          ban.user_id,
          ban.reason || null,
          ban.created_at || new Date()
        ],
        'id'
      );
      stats.bans++;
    }
    console.log(`   ✅ Migrated ${stats.bans} bans\n`);
    
    // ============================================================
    // MIGRATION COMPLETE
    // ============================================================
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           ✅ MIGRATION COMPLETED SUCCESSFULLY!           ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  👥 Users:           ${String(stats.users).padEnd(35)} ║`);
    console.log(`║  🏢 Servers:         ${String(stats.servers).padEnd(35)} ║`);
    console.log(`║  👤 Server Members:  ${String(stats.server_members).padEnd(35)} ║`);
    console.log(`║  📁 Categories:      ${String(stats.categories).padEnd(35)} ║`);
    console.log(`║  📢 Channels:        ${String(stats.channels).padEnd(35)} ║`);
    console.log(`║  💬 Messages:        ${String(stats.messages).padEnd(35)} ║`);
    console.log(`║  😀 Reactions:       ${String(stats.reactions).padEnd(35)} ║`);
    console.log(`║  🤝 Friendships:     ${String(stats.friendships).padEnd(35)} ║`);
    console.log(`║  💌 DM Channels:     ${String(stats.dm_channels).padEnd(35)} ║`);
    console.log(`║  💌 DM Messages:     ${String(stats.dm_messages).padEnd(35)} ║`);
    console.log(`║  🔗 Invites:         ${String(stats.invites).padEnd(35)} ║`);
    console.log(`║  🚫 Bans:            ${String(stats.bans).padEnd(35)} ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

// Run migration
migrate();
