#!/usr/bin/env python3

# Baca file
with open("/opt/workgrid/server/database-postgres.js", "r") as f:
    content = f.read()

# Fungsi yang akan ditambahkan
new_function = """
  async getDMUnreadCountsForUser(userId) {
    // Get unread counts for both 1-on-1 DMs and Group DMs
    // Simple approach: get all DM channels where user is member, then count unread
    const rows = await queryMany(
      `SELECT 
        dc.id as channel_id,
        COUNT(dm.id) FILTER (WHERE dm.sender_id::text != $1) as unread_count
       FROM dm_channels dc
       LEFT JOIN dm_messages dm ON dm.channel_id::uuid = dc.id::uuid 
         AND dm.created_at > COALESCE(
           (SELECT last_read_at FROM dm_read_status 
            WHERE user_id::uuid = $2::uuid AND dm_channel_id::uuid = dc.id::uuid),
           '1970-01-01'::timestamptz
         )
       WHERE dc.user1_id::uuid = $3::uuid OR dc.user2_id::uuid = $4::uuid
       GROUP BY dc.id`,
      [userId, userId, userId, userId]
    );
    
    const counts = {};
    rows.forEach(row => {
      counts[row.channel_id] = parseInt(row.unread_count || 0);
    });
    return counts;
  },
"""

# Cari posisi untuk menambahkan fungsi (sebelum penutup messageDB)
# Cari pola "};" yang menutup messageDB setelah getUnreadCountForAllChannels
marker = """    return result;
  }
};

// ============================================
// REACTION DATABASE"""

new_content = content.replace(
    marker,
    """    return result;
  }
""" + new_function + """};

// ============================================
// REACTION DATABASE"""
)

# Tulis kembali
with open("/opt/workgrid/server/database-postgres.js", "w") as f:
    f.write(new_content)

print("Function added successfully!")
