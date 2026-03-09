-- Create member_roles table for custom role assignments
CREATE TABLE IF NOT EXISTS member_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES server_roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, server_id, role_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_member_roles_user ON member_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_server ON member_roles(server_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role ON member_roles(role_id);
