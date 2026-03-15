#!/usr/bin/env python3

# Baca file
with open("/opt/workgrid/server/database-postgres.js", "r") as f:
    content = f.read()

# Query lama yang perlu diperbaiki
old_query = """      `SELECT u.id, u.username, u.avatar, COALESCE(u.status, 'offline') as status, sm.role,
              u.created_at as "createdAt",
              COALESCE(sm.joined_at, u.created_at) as "joinedAt",
              sm.join_method as "joinMethod",
              ARRAY_AGG(mr.role_id) FILTER (WHERE mr.role_id IS NOT NULL) as role_ids,
              COALESCE(
                JSON_AGG(JSON_BUILD_OBJECT('id', sr.id, 'name', sr.name, 'color', sr.color))
                FILTER (WHERE sr.id IS NOT NULL),
                '[]'::json
              ) as roles,
              -- Get highest role name and color
              COALESCE(
                (SELECT sr2.name FROM member_roles mr2 
                 JOIN server_roles sr2 ON mr2.role_id = sr2.id::text
                 WHERE mr2.user_id = u.id::text AND mr2.server_id = $1
                 ORDER BY sr2.position DESC LIMIT 1),
                CASE sm.role
                  WHEN 'owner' THEN 'Owner'
                  WHEN 'admin' THEN 'Admin'
                  WHEN 'moderator' THEN 'Moderator'
                  ELSE 'Member'
                END
              ) as role_name,
              COALESCE(
                (SELECT sr2.color FROM member_roles mr2 
                 JOIN server_roles sr2 ON mr2.role_id = sr2.id::text
                 WHERE mr2.user_id = u.id::text AND mr2.server_id = $1
                 ORDER BY sr2.position DESC LIMIT 1),
                CASE sm.role
                  WHEN 'owner' THEN '#ffd700'
                  WHEN 'admin' THEN '#ed4245'
                  WHEN 'moderator' THEN '#43b581'
                  ELSE '#99aab5'
                END
              ) as role_color
       FROM users u
       JOIN server_members sm ON u.id = sm.user_id
       LEFT JOIN member_roles mr ON u.id::text = mr.user_id AND mr.server_id = $1
       LEFT JOIN server_roles sr ON mr.role_id = sr.id::text
       WHERE sm.server_id::text = $1
       GROUP BY u.id, u.username, u.avatar, u.status, u.created_at, sm.role, sm.joined_at, sm.join_method`"""

# Query baru tanpa cast ke text
new_query = """      `SELECT u.id, u.username, u.avatar, COALESCE(u.status, 'offline') as status, sm.role,
              u.created_at as "createdAt",
              COALESCE(sm.joined_at, u.created_at) as "joinedAt",
              sm.join_method as "joinMethod",
              ARRAY_AGG(mr.role_id) FILTER (WHERE mr.role_id IS NOT NULL) as role_ids,
              COALESCE(
                JSON_AGG(JSON_BUILD_OBJECT('id', sr.id, 'name', sr.name, 'color', sr.color))
                FILTER (WHERE sr.id IS NOT NULL),
                '[]'::json
              ) as roles,
              -- Get highest role name and color
              COALESCE(
                (SELECT sr2.name FROM member_roles mr2 
                 JOIN server_roles sr2 ON mr2.role_id = sr2.id
                 WHERE mr2.user_id = u.id AND mr2.server_id = $1::uuid
                 ORDER BY sr2.position DESC LIMIT 1),
                CASE sm.role
                  WHEN 'owner' THEN 'Owner'
                  WHEN 'admin' THEN 'Admin'
                  WHEN 'moderator' THEN 'Moderator'
                  ELSE 'Member'
                END
              ) as role_name,
              COALESCE(
                (SELECT sr2.color FROM member_roles mr2 
                 JOIN server_roles sr2 ON mr2.role_id = sr2.id
                 WHERE mr2.user_id = u.id AND mr2.server_id = $1::uuid
                 ORDER BY sr2.position DESC LIMIT 1),
                CASE sm.role
                  WHEN 'owner' THEN '#ffd700'
                  WHEN 'admin' THEN '#ed4245'
                  WHEN 'moderator' THEN '#43b581'
                  ELSE '#99aab5'
                END
              ) as role_color
       FROM users u
       JOIN server_members sm ON u.id = sm.user_id
       LEFT JOIN member_roles mr ON u.id = mr.user_id AND mr.server_id = $1::uuid
       LEFT JOIN server_roles sr ON mr.role_id = sr.id
       WHERE sm.server_id = $1::uuid
       GROUP BY u.id, u.username, u.avatar, u.status, u.created_at, sm.role, sm.joined_at, sm.join_method`"""

new_content = content.replace(old_query, new_query)

# Tulis kembali
with open("/opt/workgrid/server/database-postgres.js", "w") as f:
    f.write(new_content)

print("getMembers query fixed!")
