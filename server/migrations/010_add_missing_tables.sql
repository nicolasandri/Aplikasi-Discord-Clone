-- Migration 010: Add missing tables and columns for full functionality

-- ============================================================
-- SERVER_ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS server_roles (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#99aab5',
  permissions INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, name)
);

CREATE INDEX IF NOT EXISTS idx_server_roles_server_id ON server_roles(server_id);

-- ============================================================
-- MEMBER_ROLES TABLE (custom role assignments)
-- ============================================================
CREATE TABLE IF NOT EXISTS member_roles (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES server_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_member_roles_server_user ON member_roles(server_id, user_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role_id ON member_roles(role_id);

-- ============================================================
-- CHANNEL_READ_STATUS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_read_status (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  last_read_message_id TEXT,
  last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_read_status_user ON channel_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_read_status_channel ON channel_read_status(channel_id);

-- ============================================================
-- AUDIT_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_server_id ON audit_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- MISSING COLUMNS IN EXISTING TABLES
-- ============================================================

-- Add is_pinned, pinned_at, pinned_by to messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='messages' AND column_name='is_pinned') THEN
        ALTER TABLE messages ADD COLUMN is_pinned BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='messages' AND column_name='pinned_at') THEN
        ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='messages' AND column_name='pinned_by') THEN
        ALTER TABLE messages ADD COLUMN pinned_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add joined_via_group_code to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='joined_via_group_code') THEN
        ALTER TABLE users ADD COLUMN joined_via_group_code TEXT;
    END IF;
END $$;

-- Add edited_at to messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='messages' AND column_name='edited_at') THEN
        ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP;
    END IF;
END $$;

-- Add forwarded_from to messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='messages' AND column_name='forwarded_from') THEN
        ALTER TABLE messages ADD COLUMN forwarded_from TEXT;
    END IF;
END $$;

-- Add display_name to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='display_name') THEN
        ALTER TABLE users ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- Add role_id to invites
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='invites' AND column_name='role_id') THEN
        ALTER TABLE invites ADD COLUMN role_id TEXT;
    END IF;
END $$;

-- Add description to servers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='servers' AND column_name='description') THEN
        ALTER TABLE servers ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add banner to servers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='servers' AND column_name='banner') THEN
        ALTER TABLE servers ADD COLUMN banner TEXT;
    END IF;
END $$;

-- Add updated_at to servers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='servers' AND column_name='updated_at') THEN
        ALTER TABLE servers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add attachments to messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='messages' AND column_name='attachments') THEN
        ALTER TABLE messages ADD COLUMN attachments TEXT DEFAULT '[]';
    END IF;
END $$;

-- Add reply_to_id to messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='messages' AND column_name='reply_to_id') THEN
        ALTER TABLE messages ADD COLUMN reply_to_id TEXT;
    END IF;
END $$;
