-- Custom Emoji and Stickers Tables

-- Custom Emoji table (server-specific and global)
CREATE TABLE IF NOT EXISTS custom_emojis (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    server_id TEXT,
    uploader_id TEXT NOT NULL,
    is_global BOOLEAN DEFAULT 0,
    is_animated BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stickers table (server-specific and global)
CREATE TABLE IF NOT EXISTS stickers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    server_id TEXT,
    uploader_id TEXT NOT NULL,
    is_global BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sticker Packs (collections)
CREATE TABLE IF NOT EXISTS sticker_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    server_id TEXT,
    creator_id TEXT NOT NULL,
    is_global BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sticker Pack Items (many-to-many)
CREATE TABLE IF NOT EXISTS sticker_pack_items (
    pack_id TEXT NOT NULL,
    sticker_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (pack_id, sticker_id),
    FOREIGN KEY (pack_id) REFERENCES sticker_packs(id) ON DELETE CASCADE,
    FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_emojis_server ON custom_emojis(server_id);
CREATE INDEX IF NOT EXISTS idx_custom_emojis_global ON custom_emojis(is_global);
CREATE INDEX IF NOT EXISTS idx_stickers_server ON stickers(server_id);
CREATE INDEX IF NOT EXISTS idx_stickers_global ON stickers(is_global);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_server ON sticker_packs(server_id);
